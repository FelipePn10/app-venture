import { useState, useCallback } from "react";
import { humanizeApiError } from '@/services/apiError';
import {
  createDemanda,
  listDemandas,
  listDemandaByItem,
  listDemandaFromDate,
  getDemanda,
  type DemandaResponse,
} from "@/services/demandaService";
import { useAuthStore } from "@/store/authStore";

// ─── Types ────────────────────────────────────────────────────────────────────

type ModoForm = "novo" | "edicao";
type FeedbackState = { type: "success" | "error" | "info"; message: string } | null;

interface FormDemanda {
  demanda: string;    // code_demand (int64 as string, "" = auto / next available)
  item: string;       // item_code (int64 as string)
  configurado: boolean; // UI toggle — controls whether mask is shown/required
  mask: string;       // mask (optional config string)
  cCusto: string;     // cost_center_code (int64 as string)
  quantidade: string; // quantity (float64 as string)
  data: string;       // demand_date (YYYY-MM-DD)
}

interface ConfiguracaoItem {
  codigo: string;
  descricao: string;
}

const FORM_INICIAL: FormDemanda = {
  demanda: "",
  item: "",
  configurado: false,
  mask: "",
  cCusto: "",
  quantidade: "",
  data: "",
};

// ─── Helpers ──────────────────────────────────────────────────────────────────

function isWeekend(dateStr: string): boolean {
  if (!dateStr) return false;
  const d = new Date(dateStr + "T12:00:00");
  return d.getDay() === 0 || d.getDay() === 6;
}

function formatDateBR(iso: string): string {
  if (!iso || iso.length < 10) return "—";
  const [y, m, d] = iso.substring(0, 10).split("-");
  return `${d}/${m}/${y}`;
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
  } catch { return undefined; }
}

function normalizeError(error: unknown, fallback: string): string {
  return humanizeApiError(error, fallback);
}

// ─── Component ────────────────────────────────────────────────────────────────

export function Vpla0102Page(): JSX.Element {
  const user  = useAuthStore((s) => s.user);
  const token = useAuthStore((s) => s.token);

  // Form
  const [form, setForm]               = useState<FormDemanda>(FORM_INICIAL);
  const [modoForm, setModoForm]       = useState<ModoForm>("novo");
  const [demandaEdit, setDemandaEdit] = useState<number | null>(null);
  const [errors, setErrors]           = useState<Partial<Record<keyof FormDemanda, string>>>({});

  // Config modal
  const [showConfigModal, setShowConfigModal]   = useState(false);
  const [configuracoes, setConfiguracoes]       = useState<ConfiguracaoItem[]>([]);
  const [novaConfigCod, setNovaConfigCod]       = useState("");
  const [novaConfigDesc, setNovaConfigDesc]     = useState("");

  // Search
  const [filtroItem,       setFiltroItem]       = useState("");
  const [filtroDataInicio, setFiltroDataInicio] = useState("");
  const [filtroDataFim,    setFiltroDataFim]    = useState("");
  const [resultados,       setResultados]       = useState<DemandaResponse[]>([]);
  const [mostrarResultados, setMostrarResultados] = useState(false);

  // Loading / feedback
  const [isSaving,    setIsSaving]    = useState(false);
  const [isLoading,   setIsLoading]   = useState(false);
  const [isSearching, setIsSearching] = useState(false);
  const [feedback,    setFeedback]    = useState<FeedbackState>(null);

  const setField = useCallback(<K extends keyof FormDemanda>(key: K, val: FormDemanda[K]) => {
    setForm((prev) => ({ ...prev, [key]: val }));
    setErrors((prev) => ({ ...prev, [key]: undefined }));
    setFeedback(null);
  }, []);

  // ── Validation
  function validate(): boolean {
    const e: Partial<Record<keyof FormDemanda, string>> = {};
    if (form.demanda.trim() && (isNaN(Number(form.demanda)) || Number(form.demanda) <= 0)) {
      e.demanda = "Deve ser um número inteiro positivo.";
    }
    if (!form.item.trim() || isNaN(Number(form.item)) || Number(form.item) <= 0) {
      e.item = "Código do item obrigatório (número inteiro).";
    }
    if (form.configurado && !form.mask.trim()) {
      e.mask = "Informe a máscara (configuração) do item configurado.";
    }
    if (!form.quantidade.trim() || isNaN(Number(form.quantidade)) || Number(form.quantidade) <= 0) {
      e.quantidade = "Quantidade deve ser um número positivo.";
    }
    if (!form.data) {
      e.data = "Data obrigatória.";
    } else if (isWeekend(form.data)) {
      e.data = "Data deve ser um dia útil (não pode ser sábado ou domingo).";
    }
    setErrors(e);
    return Object.keys(e).length === 0;
  }

  // ── Load by demand code
  async function handleCarregarDemanda() {
    const num = Number(form.demanda.trim());
    if (!form.demanda.trim() || isNaN(num) || num <= 0) {
      setErrors((p) => ({ ...p, demanda: "Informe um número para consultar." }));
      return;
    }
    setIsLoading(true);
    setFeedback(null);
    try {
      const d = await getDemanda(num);
      if (!d) {
        setFeedback({ type: "info", message: `Demanda ${num} não encontrada.` });
        return;
      }
      setForm({
        demanda:     String(d.code_demand),
        item:        String(d.item_code),
        configurado: !!d.mask,
        mask:        d.mask ?? "",
        cCusto:      d.cost_center_code != null ? String(d.cost_center_code) : "",
        quantidade:  String(d.quantity),
        data:        d.demand_date ?? "",
      });
      setErrors({});
      setModoForm("edicao");
      setDemandaEdit(d.code_demand);
      setFeedback({ type: "info", message: `Demanda ${d.code_demand} — Item ${d.item_code} carregada para edição.` });
    } catch (error) {
      setFeedback({ type: "error", message: normalizeError(error, "Erro ao consultar demanda.") });
    } finally {
      setIsLoading(false);
    }
  }

  // ── Save (create)
  async function handleSalvar() {
    if (!validate()) return;
    setIsSaving(true);
    setFeedback(null);
    try {
      const createdBy = user?.id ?? decodeJwtSub(token) ?? "anonymous";
      const result = await createDemanda({
        code_demand:      form.demanda.trim() ? Number(form.demanda) : 0,
        item_code:        Number(form.item),
        mask:             form.configurado && form.mask.trim() ? form.mask.trim() : undefined,
        cost_center_code: form.cCusto.trim() ? Number(form.cCusto) : undefined,
        quantity:         Number(form.quantidade),
        demand_date:      form.data,
        created_by:       createdBy,
      });
      setForm((prev) => ({ ...prev, demanda: String(result.code_demand) }));
      setModoForm("edicao");
      setDemandaEdit(result.code_demand);
      setFeedback({
        type: "success",
        message: `Demanda ${result.code_demand} — Item ${result.item_code} salva com sucesso.`,
      });
    } catch (error) {
      setFeedback({ type: "error", message: normalizeError(error, "Erro ao salvar demanda.") });
    } finally {
      setIsSaving(false);
    }
  }

  // ── Search — routes to the correct endpoint based on filled filters
  async function handlePesquisar() {
    setIsSearching(true);
    setFeedback(null);
    try {
      let results: DemandaResponse[];
      if (filtroItem.trim() && !isNaN(Number(filtroItem))) {
        results = await listDemandaByItem(Number(filtroItem));
      } else if (filtroDataInicio.trim()) {
        results = await listDemandaFromDate(filtroDataInicio);
      } else {
        results = await listDemandas();
      }
      setResultados(results);
      setMostrarResultados(true);
      if (results.length === 0) {
        setFeedback({ type: "info", message: "Nenhuma demanda encontrada para o filtro informado." });
      }
    } catch (error) {
      setFeedback({ type: "error", message: normalizeError(error, "Erro ao pesquisar demandas.") });
    } finally {
      setIsSearching(false);
    }
  }

  // ── Select from list
  function handleSelectFromList(d: DemandaResponse) {
    setForm({
      demanda:     String(d.code_demand),
      item:        String(d.item_code),
      configurado: !!d.mask,
      mask:        d.mask ?? "",
      cCusto:      d.cost_center_code != null ? String(d.cost_center_code) : "",
      quantidade:  String(d.quantity),
      data:        d.demand_date ?? "",
    });
    setErrors({});
    setFeedback(null);
    setModoForm("edicao");
    setDemandaEdit(d.code_demand);
    window.scrollTo({ top: document.body.scrollHeight, behavior: "smooth" });
  }

  // ── Novo / Limpar
  function handleNovo() {
    setForm(FORM_INICIAL);
    setErrors({});
    setFeedback(null);
    setModoForm("novo");
    setDemandaEdit(null);
  }

  function handleLimpar() {
    handleNovo();
    setResultados([]);
    setMostrarResultados(false);
    setFiltroItem("");
    setFiltroDataInicio("");
    setFiltroDataFim("");
  }

  // ── Config modal
  function handleAddConfiguracao() {
    const cod = novaConfigCod.trim();
    if (!cod) return;
    if (configuracoes.some((c) => c.codigo === cod)) return;
    setConfiguracoes((prev) => [...prev, { codigo: cod, descricao: novaConfigDesc.trim() }]);
    setNovaConfigCod("");
    setNovaConfigDesc("");
  }

  function handleUsarConfiguracao(cod: string) {
    setField("mask", cod);
    setShowConfigModal(false);
  }

  // ─── JSX ──────────────────────────────────────────────────────────────────

  return (
    <>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Inter:wght@300;400;500;600&display=swap');
        *, *::before, *::after { box-sizing: border-box; margin: 0; padding: 0; }

        .pla-root {
          min-height: 100vh; background: #dfe4e0;
          font-family: 'Inter', sans-serif; color: #1c2b22;
          display: flex; flex-direction: column;
        }

        /* ── TOPBAR ── */
        .pla-topbar {
          height: 52px; background: #16281d;
          display: flex; align-items: center; justify-content: space-between;
          padding: 0 110px 0 20px; flex-shrink: 0;
          border-bottom: 1px solid rgba(62,150,84,0.15);
        }
        .pla-topbar-left { display: flex; align-items: center; gap: 10px; }
        .pla-logo-mark {
          width: 28px; height: 28px; background: #2f7d47;
          border-radius: 6px; display: flex; align-items: center; justify-content: center;
        }
        .pla-app-name { font-size: 13px; font-weight: 600; color: #e0f0e3; line-height: 1.1; }
        .pla-app-sub  { display: block; font-size: 9px; font-weight: 400; color: #54655a; }
        .pla-screen-title {
          font-size: 12.5px; font-weight: 500; color: #3f8a58;
          padding-left: 14px; margin-left: 14px;
          border-left: 1px solid rgba(255,255,255,0.08);
        }
        .pla-topbar-right { display: flex; align-items: center; gap: 8px; }
        .pla-screen-badge {
          font-size: 10px; font-weight: 700; letter-spacing: 0.8px;
          background: rgba(62,150,84,0.15); color: #8fce9f;
          border: 1px solid rgba(62,150,84,0.25); border-radius: 5px;
          padding: 3px 8px;
        }

        /* ── ACTION BAR ── */
        .pla-actionbar {
          background: #fff; border-bottom: 1px solid #dbe8d5;
          padding: 0 20px; display: flex; align-items: center;
          gap: 4px; height: 46px; flex-shrink: 0;
        }
        .pla-action-group {
          display: flex; align-items: center; gap: 4px;
          padding-right: 12px; margin-right: 8px;
          border-right: 1px solid #e8f0e4;
        }
        .pla-action-group:last-child { border-right: none; }
        .pla-action-label {
          font-size: 9.5px; font-weight: 600; letter-spacing: 0.8px;
          text-transform: uppercase; color: #94a49a; margin-right: 4px; white-space: nowrap;
        }
        .pla-btn {
          display: inline-flex; align-items: center; gap: 6px;
          height: 32px; padding: 0 12px; border: 1.5px solid transparent;
          border-radius: 7px; font-family: 'Inter', sans-serif;
          font-size: 12.5px; font-weight: 500; cursor: pointer; white-space: nowrap;
          transition: background 0.13s, border-color 0.13s, color 0.13s;
        }
        .pla-btn-primary { background: #16281d; color: #dff0e2; border-color: #16281d; }
        .pla-btn-primary:hover:not(:disabled) { background: #1e3728; }
        .pla-btn-primary:disabled { opacity: 0.5; cursor: not-allowed; }
        .pla-btn-ghost { background: transparent; color: #46574c; border-color: #d4e8d0; }
        .pla-btn-ghost:hover:not(:disabled) { background: #f0f8ec; border-color: #a9b6ac; color: #1c2b22; }
        .pla-btn-ghost:disabled { opacity: 0.5; cursor: not-allowed; }
        .pla-btn-new {
          background: #eef9f0; color: #1a6030; border-color: #b4d8b8; font-weight: 600;
        }
        .pla-btn-new:hover:not(:disabled) { background: #dff5e4; border-color: #88c898; }
        .pla-btn-config {
          background: #f0eeff; color: #4a1e9a; border-color: #c8b4e8; font-weight: 600;
        }
        .pla-btn-config:hover:not(:disabled) { background: #e4d8ff; border-color: #a888d8; }
        .pla-btn-config:disabled { opacity: 0.45; cursor: not-allowed; }

        /* ── BODY ── */
        .pla-body {
          flex: 1; padding: 16px 20px;
          display: flex; flex-direction: column; overflow-y: auto;
        }
        .pla-body::-webkit-scrollbar { width: 5px; }
        .pla-body::-webkit-scrollbar-thumb { background: #cce0c8; border-radius: 4px; }

        /* ── SECTION BANNER ── */
        .pla-section-banner {
          display: flex; align-items: center; gap: 10px;
          padding: 14px 0 8px;
        }
        .pla-section-banner:first-child { padding-top: 0; }
        .pla-section-banner-pill {
          font-size: 9.5px; font-weight: 700; letter-spacing: 1.2px;
          text-transform: uppercase; color: #6b7d71;
          background: #e0ede0; border: 1px solid #c8dcc8;
          border-radius: 20px; padding: 3px 10px; white-space: nowrap;
        }
        .pla-section-banner-line { flex: 1; height: 1px; background: #dbe8d5; }
        .pla-section-banner-hint { font-size: 11px; color: #94a49a; white-space: nowrap; }

        /* ── CARD ── */
        .pla-card {
          background: #fff; border: 1px solid #dbe8d5;
          border-radius: 12px; overflow: hidden; margin-bottom: 14px;
        }
        .pla-card-header {
          display: flex; align-items: center; justify-content: space-between;
          padding: 12px 18px; border-bottom: 1px solid #edf5e8; background: #fafcf9;
        }
        .pla-card-header-left { display: flex; align-items: center; gap: 8px; }
        .pla-card-title { font-size: 12px; font-weight: 600; color: #253a2d; text-transform: uppercase; letter-spacing: 0.6px; }
        .pla-card-body { padding: 18px 18px; }

        /* ── MODO BADGES ── */
        .pla-modo-novo {
          display: inline-flex; align-items: center; gap: 5px;
          font-size: 11px; font-weight: 600; padding: 3px 10px;
          border-radius: 20px; background: #e8f5e0; color: #1e5818;
          border: 1px solid #a8d898;
        }
        .pla-modo-edicao {
          display: inline-flex; align-items: center; gap: 5px;
          font-size: 11px; font-weight: 600; padding: 3px 10px;
          border-radius: 20px; background: #fff8e0; color: #7a5200;
          border: 1px solid #e0c860;
        }
        .pla-modo-dot { width: 6px; height: 6px; border-radius: 50%; flex-shrink: 0; }
        .pla-modo-novo .pla-modo-dot { background: #2f7d47; }
        .pla-modo-edicao .pla-modo-dot { background: #c8a020; }

        /* ── GRID ── */
        .pla-grid { display: grid; grid-template-columns: repeat(12, 1fr); gap: 16px 14px; align-items: start; }
        .pla-col-2  { grid-column: span 2; }
        .pla-col-3  { grid-column: span 3; }
        .pla-col-4  { grid-column: span 4; }
        .pla-col-5  { grid-column: span 5; }
        .pla-col-6  { grid-column: span 6; }
        .pla-col-8  { grid-column: span 8; }
        .pla-col-12 { grid-column: span 12; }

        /* ── FIELDS ── */
        .pla-field { display: flex; flex-direction: column; gap: 5px; }
        .pla-label {
          font-size: 10.5px; font-weight: 600; color: #6b7d71;
          text-transform: uppercase; letter-spacing: 0.4px;
          display: flex; align-items: center; gap: 4px;
        }
        .pla-label-req { color: #c84040; font-size: 12px; line-height: 1; }
        .pla-input {
          width: 100%; height: 36px; background: #f8fbf6;
          border: 1.5px solid #d4e8cc; border-radius: 7px;
          padding: 0 10px; font-family: 'Inter', sans-serif;
          font-size: 13px; color: #1c2b22; outline: none;
          transition: border-color 0.13s, box-shadow 0.13s;
        }
        .pla-input:focus { border-color: #2f7d47; box-shadow: 0 0 0 2px rgba(62,150,84,0.1); }
        .pla-input::placeholder { color: #a9b6ac; font-size: 12px; }
        .pla-input:disabled { background: #dfe4e0; color: #8aaa94; cursor: not-allowed; border-color: #e0ead8; }
        .pla-input.has-error { border-color: #e05252; box-shadow: 0 0 0 2px rgba(224,82,82,0.1); }
        .pla-input[type="date"] { cursor: pointer; }
        .pla-input[type="number"] { -moz-appearance: textfield; }
        .pla-input[type="number"]::-webkit-outer-spin-button,
        .pla-input[type="number"]::-webkit-inner-spin-button { -webkit-appearance: none; }

        .pla-input-wrap { position: relative; display: flex; }
        .pla-input-wrap .pla-input { border-radius: 7px 0 0 7px; }
        .pla-input-btn {
          height: 36px; padding: 0 10px; flex-shrink: 0;
          background: #edf5ea; border: 1.5px solid #d4e8cc; border-left: none;
          border-radius: 0 7px 7px 0; display: flex; align-items: center;
          justify-content: center; gap: 5px;
          cursor: pointer; color: #3a6048;
          font-family: 'Inter', sans-serif; font-size: 11.5px; font-weight: 500;
          transition: background 0.12s; white-space: nowrap;
        }
        .pla-input-btn:hover { background: #ddf0e0; }
        .pla-input-btn:disabled { opacity: 0.4; cursor: not-allowed; }

        .pla-field-error { font-size: 11px; color: #c84040; margin-top: 2px; display: flex; align-items: center; gap: 4px; }
        .pla-field-hint  { font-size: 11px; color: #7a9c84; margin-top: 2px; line-height: 1.45; }

        /* ── TOGGLE ── */
        .pla-toggle-row { display: flex; align-items: center; gap: 10px; padding-top: 2px; height: 36px; }
        .pla-toggle { position: relative; width: 38px; height: 20px; flex-shrink: 0; cursor: pointer; }
        .pla-toggle input { opacity: 0; width: 0; height: 0; position: absolute; }
        .pla-toggle-track { position: absolute; inset: 0; background: #d4e0d0; border-radius: 20px; transition: background 0.2s; }
        .pla-toggle input:checked ~ .pla-toggle-track { background: #2f7d47; }
        .pla-toggle-thumb {
          position: absolute; top: 3px; left: 3px; width: 14px; height: 14px;
          background: #fff; border-radius: 50%; transition: transform 0.2s;
          box-shadow: 0 1px 3px rgba(0,0,0,0.15);
        }
        .pla-toggle input:checked ~ .pla-toggle-thumb { transform: translateX(18px); }
        .pla-toggle-label { font-size: 13px; color: #46574c; font-weight: 500; user-select: none; }
        .pla-toggle-sub   { font-size: 11px; color: #8aaa94; }

        /* ── SECTION DIVIDER ── */
        .pla-section-sep { height: 1px; background: #edf5e8; margin: 18px 0 14px; }
        .pla-section-label {
          font-size: 10px; font-weight: 700; letter-spacing: 1px;
          text-transform: uppercase; color: #a0b8a8; margin-bottom: 14px;
          display: flex; align-items: center; gap: 8px;
        }
        .pla-section-label::after { content: ''; flex: 1; height: 1px; background: #e8f0e4; }

        /* ── FILTER ROW ── */
        .pla-filter-row { display: flex; align-items: flex-end; gap: 12px; flex-wrap: wrap; }
        .pla-filter-field { display: flex; flex-direction: column; gap: 5px; }
        .pla-filter-input {
          height: 34px; background: #f8fbf6; border: 1.5px solid #d4e8cc;
          border-radius: 7px; padding: 0 10px;
          font-family: 'Inter', sans-serif; font-size: 13px; color: #1c2b22; outline: none;
          transition: border-color 0.13s;
        }
        .pla-filter-input:focus { border-color: #2f7d47; }
        .pla-filter-input::placeholder { color: #a9b6ac; font-size: 12px; }
        .pla-filter-input[type="date"] { cursor: pointer; }

        /* ── RESULTS TABLE ── */
        .pla-results-wrap { border-top: 1px solid #edf5e8; overflow-x: auto; }
        .pla-results-bar {
          display: flex; align-items: center; justify-content: space-between;
          padding: 10px 18px; background: #f4f9f2; border-bottom: 1px solid #e8f0e4;
        }
        .pla-results-label { font-size: 11px; font-weight: 600; color: #46574c; text-transform: uppercase; letter-spacing: 0.5px; }
        .pla-results-hint  { font-size: 11px; color: #94a49a; }
        .pla-results-table { width: 100%; border-collapse: collapse; font-size: 13px; }
        .pla-results-table th {
          background: #f4f9f2; padding: 8px 12px; text-align: left;
          font-size: 10.5px; font-weight: 700; color: #6b7d71;
          text-transform: uppercase; letter-spacing: 0.5px;
          border-bottom: 1.5px solid #dbe8d5; white-space: nowrap;
        }
        .pla-results-table td { padding: 9px 12px; border-bottom: 1px solid #f0f6ec; color: #233029; vertical-align: middle; }
        .pla-results-table tbody tr { cursor: pointer; transition: background 0.1s; }
        .pla-results-table tbody tr:hover { background: #eef9f0; }
        .pla-results-empty { text-align: center; padding: 28px 12px; color: #94a49a; font-size: 12.5px; }
        .pla-tag {
          display: inline-flex; align-items: center;
          font-size: 11px; font-weight: 600; border-radius: 12px; padding: 2px 8px;
        }
        .pla-tag-sim { background: #e8f5e0; color: #2a6018; border: 1px solid #b4d898; }
        .pla-tag-nao { background: #f4f4f4; color: #6b7d71; border: 1px solid #dde8d8; }

        /* ── FEEDBACK ── */
        .pla-feedback {
          display: flex; align-items: center; gap: 9px; padding: 11px 15px;
          border-radius: 9px; font-size: 13px; animation: plaFadeIn 0.2s ease;
          margin-bottom: 14px;
        }
        .pla-feedback.success { background: #f0faf2; border: 1px solid #b4dec0; color: #1e6030; }
        .pla-feedback.error   { background: #fff5f5; border: 1px solid #f8c0c0; border-left: 3px solid #e05252; color: #b91c1c; }
        .pla-feedback.info    { background: #f0f8ff; border: 1px solid #c7def8; border-left: 3px solid #4a90d9; color: #1a4070; }

        /* ── FOOTER ── */
        .pla-footer {
          background: #fff; border-top: 1px solid #dbe8d5;
          padding: 8px 20px; display: flex; align-items: center;
          justify-content: space-between; flex-shrink: 0;
        }
        .pla-footer-stat { display: flex; align-items: center; gap: 6px; font-size: 11.5px; color: #6b7d71; }
        .pla-footer-stat strong { color: #1c2b22; font-weight: 600; }

        /* ── MODAL ── */
        .pla-modal-overlay {
          position: fixed; inset: 0; background: rgba(0,0,0,0.45);
          display: flex; align-items: center; justify-content: center;
          z-index: 1000; animation: plaFadeIn 0.15s ease;
        }
        .pla-modal {
          background: #fff; border-radius: 14px; width: 560px; max-width: 90vw;
          max-height: 80vh; display: flex; flex-direction: column;
          box-shadow: 0 8px 40px rgba(0,0,0,0.2);
        }
        .pla-modal-header {
          display: flex; align-items: center; justify-content: space-between;
          padding: 16px 20px; border-bottom: 1px solid #edf5e8;
        }
        .pla-modal-title { font-size: 13.5px; font-weight: 600; color: #16281d; }
        .pla-modal-close {
          background: none; border: none; cursor: pointer; color: #8aaa94;
          padding: 4px; border-radius: 6px; display: flex; align-items: center;
          transition: background 0.12s, color 0.12s;
        }
        .pla-modal-close:hover { background: #dfe4e0; color: #46574c; }
        .pla-modal-body { padding: 18px 20px; overflow-y: auto; flex: 1; }
        .pla-modal-footer {
          padding: 12px 20px; border-top: 1px solid #edf5e8;
          display: flex; justify-content: flex-end; gap: 8px;
        }
        .pla-modal-add-row { display: flex; gap: 8px; margin-bottom: 16px; align-items: flex-end; }
        .pla-modal-table { width: 100%; border-collapse: collapse; font-size: 13px; }
        .pla-modal-table th {
          background: #f4f9f2; padding: 7px 10px; text-align: left;
          font-size: 10.5px; font-weight: 700; color: #6b7d71;
          text-transform: uppercase; letter-spacing: 0.5px;
          border-bottom: 1.5px solid #dbe8d5;
        }
        .pla-modal-table td { padding: 8px 10px; border-bottom: 1px solid #f0f6ec; color: #233029; }
        .pla-modal-table tbody tr:hover { background: #f0faf2; }
        .pla-modal-empty { text-align: center; padding: 24px; color: #94a49a; font-size: 12.5px; }
        .pla-modal-usar {
          background: none; border: 1px solid #b4d8b8; border-radius: 5px;
          color: #2a6030; font-size: 11px; font-weight: 600; cursor: pointer;
          padding: 3px 9px; transition: background 0.12s;
          font-family: 'Inter', sans-serif;
        }
        .pla-modal-usar:hover { background: #e8f5e0; }
        .pla-remove-btn {
          background: transparent; border: none; cursor: pointer; color: #c89090;
          padding: 3px 6px; border-radius: 5px; font-size: 12px;
          transition: background 0.12s, color 0.12s;
        }
        .pla-remove-btn:hover { background: #fdecea; color: #b94040; }

        @keyframes spin { to { transform: rotate(360deg); } }
        .pla-spinner {
          width: 14px; height: 14px; flex-shrink: 0;
          border: 2px solid rgba(223,240,226,0.3); border-top-color: #dff0e2;
          border-radius: 50%; animation: spin 0.65s linear infinite;
        }
        .pla-spinner-dark {
          width: 14px; height: 14px; flex-shrink: 0;
          border: 2px solid #d4e8cc; border-top-color: #2f7d47;
          border-radius: 50%; animation: spin 0.65s linear infinite;
        }
        @keyframes plaFadeIn { from { opacity: 0; transform: translateY(-4px); } to { opacity: 1; transform: translateY(0); } }
      `}</style>

      <div className="pla-root">

        {/* ── TOPBAR ── */}
        <header className="pla-topbar">
          <div className="pla-topbar-left">
            <div className="pla-logo-mark">
              <svg width="15" height="15" viewBox="0 0 18 18" fill="none">
                <rect x="1.5" y="1.5"   width="6" height="6" rx="1.2" fill="rgba(255,255,255,0.9)" />
                <rect x="10.5" y="1.5"  width="6" height="6" rx="1.2" fill="rgba(255,255,255,0.4)" />
                <rect x="1.5" y="10.5"  width="6" height="6" rx="1.2" fill="rgba(255,255,255,0.4)" />
                <rect x="10.5" y="10.5" width="6" height="6" rx="1.2" fill="rgba(255,255,255,0.7)" />
              </svg>
            </div>
            <span className="pla-app-name">
              Venture <span className="pla-app-sub">ERP &amp; Soluções</span>
            </span>
            <span className="pla-screen-title">VPLA0102 — Cadastro de Demandas Independentes</span>
          </div>
          <div className="pla-topbar-right">
            <span className="pla-screen-badge">PLANEJAMENTO</span>
          </div>
        </header>

        {/* ── ACTION BAR ── */}
        <div className="pla-actionbar">
          <div className="pla-action-group">
            <span className="pla-action-label">Cadastro</span>
            <button type="button" className="pla-btn pla-btn-new" onClick={handleNovo}>
              <svg width="12" height="12" viewBox="0 0 12 12" fill="none">
                <path d="M6 1v10M1 6h10" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" />
              </svg>
              Nova
            </button>
            <button
              type="button" className="pla-btn pla-btn-primary"
              onClick={handleSalvar} disabled={isSaving}
            >
              {isSaving ? <span className="pla-spinner" /> : (
                <svg width="12" height="12" viewBox="0 0 14 14" fill="none">
                  <path d="M2 7l3.5 3.5L12 3" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" />
                </svg>
              )}
              Salvar
            </button>
          </div>

          <div className="pla-action-group">
            <span className="pla-action-label">Item</span>
            <button
              type="button" className="pla-btn pla-btn-config"
              onClick={() => setShowConfigModal(true)}
              disabled={!form.item.trim()}
              title={!form.item.trim() ? "Informe um item primeiro" : "Gerenciar configurações do item"}
            >
              <svg width="12" height="12" viewBox="0 0 14 14" fill="none">
                <circle cx="7" cy="7" r="2.5" stroke="currentColor" strokeWidth="1.4" />
                <path d="M7 1v2M7 11v2M1 7h2M11 7h2M2.8 2.8l1.4 1.4M9.8 9.8l1.4 1.4M2.8 11.2l1.4-1.4M9.8 4.2l1.4-1.4" stroke="currentColor" strokeWidth="1.3" strokeLinecap="round" />
              </svg>
              Configurado
            </button>
          </div>

          <div className="pla-action-group">
            <button type="button" className="pla-btn pla-btn-ghost" onClick={handleLimpar}>
              <svg width="12" height="12" viewBox="0 0 14 14" fill="none">
                <path d="M2 2l10 10M12 2L2 12" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
              </svg>
              Limpar
            </button>
            <button type="button" className="pla-btn pla-btn-ghost">
              <svg width="12" height="12" viewBox="0 0 14 14" fill="none">
                <circle cx="7" cy="7" r="5.5" stroke="currentColor" strokeWidth="1.4" />
                <path d="M7 4.5v3M7 9.5h.01" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" />
              </svg>
              Ajuda
            </button>
          </div>
        </div>

        {/* ── BODY ── */}
        <div className="pla-body">

          {feedback && (
            <div className={`pla-feedback ${feedback.type}`}>
              <svg width="15" height="15" viewBox="0 0 16 16" fill="none">
                {feedback.type === "success"
                  ? <path d="M3 8l3.5 3.5L13 5" stroke="#1e6030" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
                  : feedback.type === "error"
                  ? <><circle cx="8" cy="8" r="6" stroke="#e05252" strokeWidth="1.4" /><path d="M8 5v3.5M8 10.5h.01" stroke="#e05252" strokeWidth="1.4" strokeLinecap="round" /></>
                  : <><circle cx="8" cy="8" r="6" stroke="#4a90d9" strokeWidth="1.4" /><path d="M8 5.5v3M8 10h.01" stroke="#4a90d9" strokeWidth="1.4" strokeLinecap="round" /></>
                }
              </svg>
              {feedback.message}
            </div>
          )}

          {/* ── 1. PESQUISAR ── */}
          <div className="pla-section-banner">
            <span className="pla-section-banner-pill">1 — Pesquisar</span>
            <div className="pla-section-banner-line" />
            <span className="pla-section-banner-hint">Filtrar demandas existentes</span>
          </div>

          <div className="pla-card">
            <div className="pla-card-header">
              <div className="pla-card-header-left">
                <svg width="14" height="14" viewBox="0 0 16 16" fill="none">
                  <circle cx="6.5" cy="6.5" r="4.5" stroke="#2f7d47" strokeWidth="1.4" />
                  <path d="M10 10l3.5 3.5" stroke="#2f7d47" strokeWidth="1.4" strokeLinecap="round" />
                </svg>
                <span className="pla-card-title">Filtros de Pesquisa</span>
              </div>
            </div>
            <div className="pla-card-body">
              <div className="pla-filter-row">
                <div className="pla-filter-field">
                  <span className="pla-label">Item</span>
                  <input
                    className="pla-filter-input" style={{ width: 160 }}
                    type="text" placeholder="Código do item..."
                    value={filtroItem}
                    onChange={(e) => setFiltroItem(e.target.value)}
                  />
                </div>
                <div className="pla-filter-field">
                  <span className="pla-label">Data Início</span>
                  <input
                    className="pla-filter-input" type="date"
                    value={filtroDataInicio}
                    onChange={(e) => setFiltroDataInicio(e.target.value)}
                  />
                </div>
                <div className="pla-filter-field">
                  <span className="pla-label">Data Fim</span>
                  <input
                    className="pla-filter-input" type="date"
                    value={filtroDataFim}
                    onChange={(e) => setFiltroDataFim(e.target.value)}
                  />
                </div>
                <button
                  type="button" className="pla-btn pla-btn-primary"
                  onClick={handlePesquisar} disabled={isSearching}
                  style={{ marginBottom: 0 }}
                >
                  {isSearching ? <span className="pla-spinner" /> : (
                    <svg width="12" height="12" viewBox="0 0 16 16" fill="none">
                      <circle cx="6.5" cy="6.5" r="4.5" stroke="currentColor" strokeWidth="1.5" />
                      <path d="M10 10l3.5 3.5" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
                    </svg>
                  )}
                  Pesquisar
                </button>
              </div>
            </div>

            {mostrarResultados && (
              <div className="pla-results-wrap">
                <div className="pla-results-bar">
                  <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                    <span className="pla-results-label">Resultados</span>
                    <span className="pla-results-hint">{resultados.length} demanda{resultados.length !== 1 ? "s" : ""} encontrada{resultados.length !== 1 ? "s" : ""}</span>
                  </div>
                  <button
                    type="button"
                    style={{ background: "none", border: "none", cursor: "pointer", fontSize: 11, color: "#7a9c84", fontFamily: "Inter, sans-serif" }}
                    onClick={() => { setMostrarResultados(false); setResultados([]); }}
                  >
                    Fechar
                  </button>
                </div>
                <table className="pla-results-table">
                  <thead>
                    <tr>
                      <th>Nº Demanda</th>
                      <th>Item</th>
                      <th>Configurado</th>
                      <th>Máscara</th>
                      <th>C. Custo</th>
                      <th>Quantidade</th>
                      <th>Data</th>
                      <th />
                    </tr>
                  </thead>
                  <tbody>
                    {resultados.length === 0 ? (
                      <tr>
                        <td colSpan={8} className="pla-results-empty">Nenhuma demanda encontrada.</td>
                      </tr>
                    ) : resultados.map((d) => (
                      <tr key={d.code_demand} onClick={() => handleSelectFromList(d)}>
                        <td><strong>{d.code_demand}</strong></td>
                        <td><code style={{ fontSize: 12, background: "#edf5ea", padding: "2px 6px", borderRadius: 4 }}>{d.item_code}</code></td>
                        <td>
                          <span className={`pla-tag ${d.mask ? "pla-tag-sim" : "pla-tag-nao"}`}>
                            {d.mask ? "Sim" : "Não"}
                          </span>
                        </td>
                        <td>{d.mask ?? "—"}</td>
                        <td>{d.cost_center_code != null ? d.cost_center_code : "—"}</td>
                        <td>{d.quantity}</td>
                        <td>{formatDateBR(d.demand_date)}</td>
                        <td>
                          <button
                            type="button" className="pla-modal-usar"
                            onClick={(e) => { e.stopPropagation(); handleSelectFromList(d); }}
                          >
                            Selecionar
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>

          {/* ── 2. CADASTRAR / EDITAR ── */}
          <div className="pla-section-banner">
            <span className="pla-section-banner-pill">2 — Cadastrar</span>
            <div className="pla-section-banner-line" />
            <span className="pla-section-banner-hint">Preencha os dados e clique em Salvar</span>
          </div>

          <div className="pla-card">
            <div className="pla-card-header">
              <div className="pla-card-header-left">
                <svg width="14" height="14" viewBox="0 0 16 16" fill="none">
                  <path d="M3 3h10v10H3z" stroke="#2f7d47" strokeWidth="1.3" strokeLinejoin="round" />
                  <path d="M6 8h4M8 6v4" stroke="#2f7d47" strokeWidth="1.3" strokeLinecap="round" />
                </svg>
                <span className="pla-card-title">Dados da Demanda</span>
              </div>
              {modoForm === "novo" ? (
                <span className="pla-modo-novo">
                  <span className="pla-modo-dot" />
                  Novo Cadastro
                </span>
              ) : (
                <span className="pla-modo-edicao">
                  <span className="pla-modo-dot" />
                  Editando Demanda #{demandaEdit}
                </span>
              )}
            </div>
            <div className="pla-card-body">
              <div className="pla-grid">

                {/* Nº Demanda */}
                <div className="pla-field pla-col-2">
                  <label className="pla-label">Nº Demanda</label>
                  <div className="pla-input-wrap">
                    <input
                      className={`pla-input${errors.demanda ? " has-error" : ""}`}
                      type="number" min="1"
                      placeholder="Automático"
                      value={form.demanda}
                      onChange={(e) => setField("demanda", e.target.value)}
                    />
                    <button
                      type="button" className="pla-input-btn"
                      onClick={handleCarregarDemanda} disabled={isLoading || !form.demanda.trim()}
                      title="Carregar demanda"
                    >
                      {isLoading ? <span className="pla-spinner-dark" /> : (
                        <svg width="12" height="12" viewBox="0 0 14 14" fill="none">
                          <circle cx="6" cy="6" r="4.5" stroke="currentColor" strokeWidth="1.4" />
                          <path d="M9.5 9.5l2.5 2.5" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" />
                        </svg>
                      )}
                      Carregar
                    </button>
                  </div>
                  {errors.demanda && <span className="pla-field-error">⚠ {errors.demanda}</span>}
                  <span className="pla-field-hint">Deixe em branco para numeração automática.</span>
                </div>

                {/* Item */}
                <div className="pla-field pla-col-4">
                  <label className="pla-label">
                    Item <span className="pla-label-req">*</span>
                  </label>
                  <input
                    className={`pla-input${errors.item ? " has-error" : ""}`}
                    type="number" min="1" placeholder="Código do item (int)..."
                    value={form.item}
                    onChange={(e) => setField("item", e.target.value)}
                  />
                  {errors.item && <span className="pla-field-error">⚠ {errors.item}</span>}
                  <span className="pla-field-hint">Deve estar cadastrado no planejamento.</span>
                </div>

              </div>

              {/* ── Configuração ── */}
              <div className="pla-section-sep" />
              <div className="pla-section-label">Configuração do Item</div>

              <div className="pla-grid">
                <div className="pla-field pla-col-4">
                  <label className="pla-label">Configurado</label>
                  <div className="pla-toggle-row">
                    <label className="pla-toggle">
                      <input
                        type="checkbox"
                        checked={form.configurado}
                        onChange={(e) => {
                          setField("configurado", e.target.checked);
                          if (!e.target.checked) setField("mask", "");
                        }}
                      />
                      <span className="pla-toggle-track" />
                      <span className="pla-toggle-thumb" />
                    </label>
                    <span className="pla-toggle-label">
                      {form.configurado ? "Item configurado" : "Item padrão"}
                    </span>
                    {form.configurado && (
                      <span className="pla-toggle-sub">— selecione uma configuração abaixo</span>
                    )}
                  </div>
                </div>

                <div className="pla-field pla-col-4">
                  <label className="pla-label">
                    Máscara (Configuração)
                    {form.configurado && <span className="pla-label-req">*</span>}
                  </label>
                  <div className="pla-input-wrap">
                    <input
                      className={`pla-input${errors.mask ? " has-error" : ""}`}
                      type="text"
                      placeholder={form.configurado ? "Máscara da configuração..." : "—"}
                      value={form.mask}
                      disabled={!form.configurado}
                      onChange={(e) => setField("mask", e.target.value)}
                    />
                    <button
                      type="button" className="pla-input-btn"
                      disabled={!form.configurado || !form.item.trim()}
                      onClick={() => setShowConfigModal(true)}
                      title="Gerenciar máscaras"
                    >
                      <svg width="12" height="12" viewBox="0 0 14 14" fill="none">
                        <circle cx="7" cy="7" r="2" stroke="currentColor" strokeWidth="1.4" />
                        <path d="M7 1.5v2M7 10.5v2M1.5 7h2M10.5 7h2" stroke="currentColor" strokeWidth="1.3" strokeLinecap="round" />
                      </svg>
                      Selecionar
                    </button>
                  </div>
                  {errors.mask && <span className="pla-field-error">⚠ {errors.mask}</span>}
                </div>
              </div>

              {/* ── Dados da demanda ── */}
              <div className="pla-section-sep" />
              <div className="pla-section-label">Quantidade e Data</div>

              <div className="pla-grid">
                {/* Centro de Custo */}
                <div className="pla-field pla-col-3">
                  <label className="pla-label">C. Custo</label>
                  <div className="pla-input-wrap">
                    <input
                      className="pla-input" type="number" min="1"
                      placeholder="Código..."
                      value={form.cCusto}
                      onChange={(e) => setField("cCusto", e.target.value)}
                    />
                    <button type="button" className="pla-input-btn" title="Selecionar centro de custo">
                      <svg width="12" height="12" viewBox="0 0 14 14" fill="none">
                        <rect x="1.5" y="1.5" width="11" height="11" rx="2" stroke="currentColor" strokeWidth="1.4" />
                        <path d="M4 7h6M7 4v6" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" />
                      </svg>
                      Selecionar
                    </button>
                  </div>
                  <span className="pla-field-hint">Cadastrado em VCTB0102.</span>
                </div>

                {/* Quantidade */}
                <div className="pla-field pla-col-3">
                  <label className="pla-label">
                    Quantidade <span className="pla-label-req">*</span>
                  </label>
                  <input
                    className={`pla-input${errors.quantidade ? " has-error" : ""}`}
                    type="number" min="0.001" step="0.001"
                    placeholder="0,000"
                    value={form.quantidade}
                    onChange={(e) => setField("quantidade", e.target.value)}
                  />
                  {errors.quantidade && <span className="pla-field-error">⚠ {errors.quantidade}</span>}
                </div>

                {/* Data */}
                <div className="pla-field pla-col-3">
                  <label className="pla-label">
                    Data <span className="pla-label-req">*</span>
                  </label>
                  <input
                    className={`pla-input${errors.data ? " has-error" : ""}`}
                    type="date"
                    value={form.data}
                    onChange={(e) => setField("data", e.target.value)}
                  />
                  {errors.data
                    ? <span className="pla-field-error">⚠ {errors.data}</span>
                    : <span className="pla-field-hint">Deve ser um dia útil no calendário industrial.</span>
                  }
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* ── FOOTER ── */}
        <footer className="pla-footer">
          <div style={{ display: "flex", alignItems: "center", gap: 20 }}>
            <div className="pla-footer-stat">
              Demanda: <strong>{form.demanda.trim() || "—"}</strong>
            </div>
            <div className="pla-footer-stat">
              Item: <strong>{form.item.trim() || "—"}</strong>
            </div>
            <div className="pla-footer-stat">
              Qtd: <strong>{form.quantidade || "—"}</strong>
            </div>
            <div className="pla-footer-stat">
              Data: <strong>{form.data ? formatDateBR(form.data) : "—"}</strong>
            </div>
          </div>
          <div className="pla-footer-stat" style={{ color: "#a0b8a8" }}>
            VPLA0102 · Planejamento
          </div>
        </footer>
      </div>

      {/* ── MODAL — Configurações do Item ── */}
      {showConfigModal && (
        <div className="pla-modal-overlay" onClick={() => setShowConfigModal(false)}>
          <div className="pla-modal" onClick={(e) => e.stopPropagation()}>
            <div className="pla-modal-header">
              <span className="pla-modal-title">
                Configurações do Item{form.item.trim() ? ` — ${form.item}` : ""}
              </span>
              <button type="button" className="pla-modal-close" onClick={() => setShowConfigModal(false)}>
                <svg width="14" height="14" viewBox="0 0 14 14" fill="none">
                  <path d="M2 2l10 10M12 2L2 12" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
                </svg>
              </button>
            </div>
            <div className="pla-modal-body">
              <p style={{ fontSize: 12, color: "#6b7d71", marginBottom: 14, lineHeight: 1.6 }}>
                Defina novas configurações para o item configurado. Clique em <strong>Usar</strong> para aplicar a configuração à demanda.
              </p>

              {/* Add row */}
              <div className="pla-modal-add-row">
                <div className="pla-filter-field" style={{ flex: "0 0 130px" }}>
                  <span className="pla-label" style={{ fontSize: 10 }}>Código</span>
                  <input
                    className="pla-filter-input" style={{ width: "100%" }}
                    type="text" placeholder="Código..."
                    value={novaConfigCod}
                    onChange={(e) => setNovaConfigCod(e.target.value)}
                    onKeyDown={(e) => e.key === "Enter" && handleAddConfiguracao()}
                  />
                </div>
                <div className="pla-filter-field" style={{ flex: 1 }}>
                  <span className="pla-label" style={{ fontSize: 10 }}>Descrição</span>
                  <input
                    className="pla-filter-input" style={{ width: "100%" }}
                    type="text" placeholder="Descrição da configuração..."
                    value={novaConfigDesc}
                    onChange={(e) => setNovaConfigDesc(e.target.value)}
                    onKeyDown={(e) => e.key === "Enter" && handleAddConfiguracao()}
                  />
                </div>
                <button
                  type="button" className="pla-btn pla-btn-new"
                  onClick={handleAddConfiguracao} disabled={!novaConfigCod.trim()}
                  style={{ flexShrink: 0 }}
                >
                  <svg width="11" height="11" viewBox="0 0 12 12" fill="none">
                    <path d="M6 1v10M1 6h10" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" />
                  </svg>
                  Adicionar
                </button>
              </div>

              {/* Table */}
              {configuracoes.length === 0 ? (
                <div className="pla-modal-empty">
                  Nenhuma configuração definida. Adicione uma acima.
                </div>
              ) : (
                <table className="pla-modal-table">
                  <thead>
                    <tr>
                      <th>Código</th>
                      <th>Descrição</th>
                      <th />
                      <th />
                    </tr>
                  </thead>
                  <tbody>
                    {configuracoes.map((c, i) => (
                      <tr key={c.codigo}>
                        <td><code style={{ fontSize: 12, background: "#edf5ea", padding: "2px 6px", borderRadius: 4 }}>{c.codigo}</code></td>
                        <td style={{ color: "#4a6a54" }}>{c.descricao || "—"}</td>
                        <td style={{ textAlign: "right" }}>
                          <button type="button" className="pla-modal-usar" onClick={() => handleUsarConfiguracao(c.codigo)}>
                            Usar
                          </button>
                        </td>
                        <td>
                          <button
                            type="button" className="pla-remove-btn"
                            onClick={() => setConfiguracoes((prev) => prev.filter((_, idx) => idx !== i))}
                            title="Remover"
                          >
                            <svg width="11" height="11" viewBox="0 0 12 12" fill="none">
                              <path d="M2 2l8 8M10 2L2 10" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" />
                            </svg>
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              )}
            </div>
            <div className="pla-modal-footer">
              <button type="button" className="pla-btn pla-btn-ghost" onClick={() => setShowConfigModal(false)}>
                Fechar
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
