import { useState, useCallback } from "react";
import axios from "axios";
import {
  criarRegraEquivalencia,
  listarRegrasEquivalencia,
  type RegraEquivalenciaDTO,
  type RegraEquivalenciaResponse,
} from "@/services/regrasConfigService";

// ─── Constants ────────────────────────────────────────────────────────────────

const MOCK_ITENS = [
  { value: 'ITEM001', label: 'Cadeira Executiva (ITEM001)', um: 'UN' },
  { value: 'ITEM002', label: 'Mesa de Escritório (ITEM002)', um: 'UN' },
  { value: 'ITEM003', label: 'Armário Modulado (ITEM003)', um: 'UN' },
  { value: 'ITEM004', label: 'Painel Divisório (ITEM004)', um: 'UN' },
  { value: 'ITEM005', label: 'Estante Modular (ITEM005)', um: 'UN' },
  { value: 'ITEM006', label: 'Parafuso M8 (ITEM006)', um: 'PC' },
  { value: 'ITEM007', label: 'Porca Sextavada (ITEM007)', um: 'PC' },
];

const MOCK_CARACTERISTICAS = [
  { value: 'COR', label: 'Cor' },
  { value: 'TAMANHO', label: 'Tamanho' },
  { value: 'MATERIAL', label: 'Material' },
  { value: 'FORMATO', label: 'Formato' },
  { value: 'TIPO_BASE', label: 'Tipo de Base' },
  { value: 'TIPO_BRACO', label: 'Tipo de Braço' },
  { value: 'ALTURA', label: 'Altura' },
  { value: 'REVESTIMENTO', label: 'Revestimento' },
];

const MOCK_OPERADORES = [
  { value: '=', label: 'Igual (=)' },
  { value: '<>', label: 'Diferente (<>)' },
  { value: '>', label: 'Maior (>)' },
  { value: '<', label: 'Menor (<)' },
  { value: '>=', label: 'Maior ou Igual (>=)' },
  { value: '<=', label: 'Menor ou Igual (<=)' },
];

// ─── Types ────────────────────────────────────────────────────────────────────

type FeedbackState = { type: "success" | "error" | "info"; message: string } | null;

interface FormRegra {
  item_pai: string;
  um: string;
  item_filho: string;
  seq: number;
  config_pai_caracteristica: string;
  config_pai_operador: string;
  config_filho_caracteristica: string;
  config_filho_operador: string;
}

const FORM_INICIAL: FormRegra = {
  item_pai: "",
  um: "",
  item_filho: "",
  seq: 10,
  config_pai_caracteristica: "",
  config_pai_operador: "=",
  config_filho_caracteristica: "",
  config_filho_operador: "=",
};

// ─── Helpers ──────────────────────────────────────────────────────────────────

function normalizeError(error: unknown, fallback: string): string {
  if (axios.isAxiosError(error)) {
    const data = error.response?.data as { message?: string; error?: string } | undefined;
    const msg = data?.message ?? data?.error;
    if (msg) return msg;
  }
  return error instanceof Error ? error.message : fallback;
}

// ─── Component ────────────────────────────────────────────────────────────────

export function Veng0204Page(): JSX.Element {
  const [form, setForm] = useState<FormRegra>(FORM_INICIAL);
  const [errors, setErrors] = useState<Partial<Record<keyof FormRegra, string>>>({});
  const [codigoEdit, setCodigoEdit] = useState<number | null>(null);

  const [filtroItemPai, setFiltroItemPai] = useState("");
  const [filtroItemFilho, setFiltroItemFilho] = useState("");
  const [resultados, setResultados] = useState<RegraEquivalenciaResponse[]>([]);
  const [mostrarResultados, setMostrarResultados] = useState(false);

  const [isSaving, setIsSaving] = useState(false);
  const [isSearching, setIsSearching] = useState(false);
  const [feedback, setFeedback] = useState<FeedbackState>(null);

  const setField = useCallback(<K extends keyof FormRegra>(key: K, value: FormRegra[K]) => {
    setForm(p => {
      const next = { ...p, [key]: value };
      if (key === 'item_pai') {
        const found = MOCK_ITENS.find(i => i.value === value);
        next.um = found?.um ?? '';
      }
      return next;
    });
    setErrors(p => ({ ...p, [key]: undefined }));
    setFeedback(null);
  }, []);

  function validate(): boolean {
    const e: Partial<Record<keyof FormRegra, string>> = {};
    if (!form.item_pai) e.item_pai = "Item Pai obrigatório.";
    if (!form.item_filho) e.item_filho = "Item Filho obrigatório.";
    if (form.seq <= 0) e.seq = "Sequência deve ser maior que zero.";
    setErrors(e);
    return Object.keys(e).length === 0;
  }

  async function handlePesquisar() {
    setIsSearching(true);
    setFeedback(null);
    try {
      const results = await listarRegrasEquivalencia({
        item_pai: filtroItemPai || undefined,
        item_filho: filtroItemFilho || undefined,
      });
      setResultados(results);
      setMostrarResultados(true);
      if (results.length === 0) {
        setFeedback({ type: "info", message: "Nenhuma regra encontrada para os filtros informados." });
      }
    } catch (error) {
      setFeedback({ type: "error", message: normalizeError(error, "Erro ao pesquisar regras.") });
    } finally {
      setIsSearching(false);
    }
  }

  function handleSelectFromList(regra: RegraEquivalenciaResponse) {
    setForm({
      item_pai: regra.item_pai,
      um: regra.um,
      item_filho: regra.item_filho,
      seq: regra.seq,
      config_pai_caracteristica: regra.config_pai_caracteristica,
      config_pai_operador: regra.config_pai_operador,
      config_filho_caracteristica: regra.config_filho_caracteristica,
      config_filho_operador: regra.config_filho_operador,
    });
    setErrors({});
    setFeedback(null);
    setCodigoEdit(regra.codigo);
  }

  async function handleSalvar() {
    if (!validate()) return;
    setIsSaving(true);
    setFeedback(null);
    try {
      const dto: RegraEquivalenciaDTO = {
        item_pai: form.item_pai,
        um: form.um,
        item_filho: form.item_filho,
        seq: form.seq,
        config_pai_caracteristica: form.config_pai_caracteristica,
        config_pai_operador: form.config_pai_operador,
        config_filho_caracteristica: form.config_filho_caracteristica,
        config_filho_operador: form.config_filho_operador,
      };
      await criarRegraEquivalencia(dto);
      setFeedback({ type: "success", message: `Regra de equivalência salva com sucesso.` });
    } catch (error) {
      setFeedback({ type: "error", message: normalizeError(error, "Erro ao salvar.") });
    } finally {
      setIsSaving(false);
    }
  }

  function handleNovo() {
    setForm(FORM_INICIAL);
    setErrors({});
    setFeedback(null);
    setCodigoEdit(null);
  }

  function handleLimpar() {
    handleNovo();
    setMostrarResultados(false);
    setFiltroItemPai("");
    setFiltroItemFilho("");
  }

  const itemPaiData = MOCK_ITENS.find(i => i.value === form.item_pai);

  return (
    <>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Inter:wght@300;400;500;600&display=swap');
        *, *::before, *::after { box-sizing: border-box; margin: 0; padding: 0; }

        .eng-root {
          min-height: 100vh; background: #f0f4ee;
          font-family: 'Inter', sans-serif; color: #1a2e22;
          display: flex; flex-direction: column;
        }
        .eng-topbar {
          height: 52px; background: #162e20;
          display: flex; align-items: center; justify-content: space-between;
          padding: 0 20px; flex-shrink: 0;
          border-bottom: 1px solid rgba(62,150,84,0.15);
        }
        .eng-topbar-left { display: flex; align-items: center; gap: 10px; }
        .eng-logo-mark {
          width: 28px; height: 28px; background: #3e9654;
          border-radius: 6px; display: flex; align-items: center; justify-content: center;
        }
        .eng-app-name { font-size: 13px; font-weight: 600; color: #e0f0e3; line-height: 1.1; }
        .eng-app-sub  { display: block; font-size: 9px; font-weight: 400; color: #3d6b4d; }
        .eng-screen-title {
          font-size: 12.5px; font-weight: 500; color: #5a9a6a;
          padding-left: 14px; margin-left: 14px;
          border-left: 1px solid rgba(255,255,255,0.08);
        }
        .eng-actionbar {
          background: #fff; border-bottom: 1px solid #dbe8d5;
          padding: 0 20px; display: flex; align-items: center;
          gap: 4px; height: 46px; flex-shrink: 0;
        }
        .eng-action-group {
          display: flex; align-items: center; gap: 4px;
          padding-right: 12px; margin-right: 8px;
          border-right: 1px solid #e8f0e4;
        }
        .eng-action-group:last-child { border-right: none; }
        .eng-action-label {
          font-size: 9.5px; font-weight: 600; letter-spacing: 0.8px;
          text-transform: uppercase; color: #96b8a0; margin-right: 4px; white-space: nowrap;
        }
        .eng-btn {
          display: inline-flex; align-items: center; gap: 6px;
          height: 32px; padding: 0 12px; border: 1.5px solid transparent;
          border-radius: 7px; font-family: 'Inter', sans-serif;
          font-size: 12.5px; font-weight: 500; cursor: pointer; white-space: nowrap;
          transition: background 0.13s, border-color 0.13s, color 0.13s;
        }
        .eng-btn-primary { background: #162e20; color: #dff0e2; border-color: #162e20; }
        .eng-btn-primary:hover:not(:disabled) { background: #1e3a2a; }
        .eng-btn-primary:disabled { opacity: 0.5; cursor: not-allowed; }
        .eng-btn-ghost { background: transparent; color: #4a7060; border-color: #d4e8d0; }
        .eng-btn-ghost:hover:not(:disabled) { background: #f0f8ec; border-color: #b0d4b8; color: #1a3828; }
        .eng-btn-ghost:disabled { opacity: 0.5; cursor: not-allowed; }
        .eng-btn-danger { background: transparent; color: #b94040; border-color: #f0c8c8; }
        .eng-btn-danger:hover:not(:disabled) { background: #fff0f0; border-color: #e09090; }
        .eng-btn-sm { height: 28px; padding: 0 9px; font-size: 12px; }
        .eng-btn-new {
          background: #eef9f0; color: #1a6030; border-color: #b4d8b8; font-weight: 600;
        }
        .eng-btn-new:hover:not(:disabled) { background: #dff5e4; border-color: #88c898; }
        .eng-btn-f {
          height: 28px; width: 28px; padding: 0;
          background: #f0f8ec; color: #3a6048; border: 1.5px solid #d4e8d0;
          border-radius: 7px; cursor: pointer; font-family: 'Inter', sans-serif;
          font-size: 12px; font-weight: 700; display: flex; align-items: center; justify-content: center;
          transition: background 0.12s; flex-shrink: 0;
        }
        .eng-btn-f:hover { background: #ddf0e0; }

        .eng-body {
          flex: 1; padding: 16px 20px; display: flex;
          flex-direction: column; gap: 0; overflow-y: auto;
        }
        .eng-body::-webkit-scrollbar { width: 5px; }
        .eng-body::-webkit-scrollbar-thumb { background: #cce0c8; border-radius: 4px; }

        .eng-section-banner {
          display: flex; align-items: center; gap: 10px; padding: 14px 0 8px;
        }
        .eng-section-banner:first-child { padding-top: 0; }
        .eng-section-pill {
          font-size: 9.5px; font-weight: 700; letter-spacing: 1.2px;
          text-transform: uppercase; color: #5a8068;
          background: #e0ede0; border: 1px solid #c8dcc8;
          border-radius: 20px; padding: 3px 10px; white-space: nowrap;
        }
        .eng-section-line { flex: 1; height: 1px; background: #dbe8d5; }
        .eng-section-hint { font-size: 11px; color: #96b8a0; white-space: nowrap; }

        .eng-card {
          background: #fff; border: 1px solid #dbe8d5;
          border-radius: 12px; overflow: hidden; margin-bottom: 14px;
        }
        .eng-card-header {
          display: flex; align-items: center; justify-content: space-between;
          padding: 12px 18px; border-bottom: 1px solid #edf5e8; background: #fafcf9;
        }
        .eng-card-header-left { display: flex; align-items: center; gap: 8px; }
        .eng-card-title { font-size: 12px; font-weight: 600; color: #2a4a35; text-transform: uppercase; letter-spacing: 0.6px; }
        .eng-card-badge {
          font-size: 10.5px; font-weight: 500; color: #3e9654;
          background: #eef5ea; border: 1px solid #c4dfc8; border-radius: 12px; padding: 2px 8px;
        }
        .eng-card-body { padding: 18px 18px; }

        .eng-grid { display: grid; grid-template-columns: repeat(12, 1fr); gap: 16px 14px; align-items: start; }
        .eng-col-2  { grid-column: span 2; }
        .eng-col-3  { grid-column: span 3; }
        .eng-col-4  { grid-column: span 4; }
        .eng-col-5  { grid-column: span 5; }
        .eng-col-6  { grid-column: span 6; }
        .eng-col-8  { grid-column: span 8; }
        .eng-col-12 { grid-column: span 12; }

        .eng-field { display: flex; flex-direction: column; gap: 5px; }
        .eng-label {
          font-size: 10.5px; font-weight: 600; color: #5a8068;
          text-transform: uppercase; letter-spacing: 0.4px;
          display: flex; align-items: center; gap: 4px;
        }
        .eng-label-req { color: #c84040; font-size: 12px; line-height: 1; }
        .eng-input {
          width: 100%; height: 36px; background: #f8fbf6;
          border: 1.5px solid #d4e8cc; border-radius: 7px;
          padding: 0 10px; font-family: 'Inter', sans-serif;
          font-size: 13px; color: #1a2e22; outline: none;
          transition: border-color 0.13s, box-shadow 0.13s;
        }
        .eng-input:focus { border-color: #3e9654; box-shadow: 0 0 0 2px rgba(62,150,84,0.1); }
        .eng-input::placeholder { color: #b0c8b8; font-size: 12px; }
        .eng-input:disabled { background: #f0f4ee; color: #8aaa94; cursor: not-allowed; border-color: #e0ead8; }
        .eng-input.has-error { border-color: #e05252; box-shadow: 0 0 0 2px rgba(224,82,82,0.1); }

        .eng-select {
          width: 100%; height: 36px; background: #f8fbf6;
          border: 1.5px solid #d4e8cc; border-radius: 7px;
          padding: 0 28px 0 10px; font-family: 'Inter', sans-serif;
          font-size: 13px; color: #1a2e22; outline: none;
          appearance: none; cursor: pointer;
          background-image: url("data:image/svg+xml,%3Csvg width='10' height='6' viewBox='0 0 10 6' xmlns='http://www.w3.org/2000/svg'%3E%3Cpath d='M1 1l4 4 4-4' stroke='%23789a84' stroke-width='1.5' fill='none' stroke-linecap='round' stroke-linejoin='round'/%3E%3C/svg%3E");
          background-repeat: no-repeat; background-position: right 10px center;
          transition: border-color 0.13s;
        }
        .eng-select:focus { border-color: #3e9654; box-shadow: 0 0 0 2px rgba(62,150,84,0.1); }
        .eng-select.has-error { border-color: #e05252; }

        .eng-field-error { font-size: 11px; color: #c84040; margin-top: 2px; display: flex; align-items: center; gap: 4px; }
        .eng-field-hint  { font-size: 11px; color: #7a9c84; margin-top: 2px; line-height: 1.45; }

        .eng-section-sep { height: 1px; background: #edf5e8; margin: 16px 0; }
        .eng-section-label {
          font-size: 10px; font-weight: 700; letter-spacing: 1px;
          text-transform: uppercase; color: #a0b8a8; margin-bottom: 12px;
          display: flex; align-items: center; gap: 8px;
        }
        .eng-section-label::after { content: ''; flex: 1; height: 1px; background: #e8f0e4; }

        .eng-filter-row { display: flex; align-items: flex-end; gap: 12px; flex-wrap: wrap; }

        .eng-results-wrap { border-top: 1px solid #edf5e8; overflow-x: auto; }
        .eng-results-bar {
          display: flex; align-items: center; justify-content: space-between;
          padding: 10px 18px; background: #f4f9f2; border-bottom: 1px solid #e8f0e4;
        }
        .eng-results-bar-left { display: flex; align-items: center; gap: 8px; }
        .eng-results-bar-label { font-size: 11px; font-weight: 600; color: #4a7060; text-transform: uppercase; letter-spacing: 0.5px; }
        .eng-results-hint { font-size: 11px; color: #96b8a0; }
        .eng-results-table { width: 100%; border-collapse: collapse; font-size: 13px; }
        .eng-results-table th {
          background: #f4f9f2; padding: 8px 12px; text-align: left;
          font-size: 10.5px; font-weight: 700; color: #5a8068;
          text-transform: uppercase; letter-spacing: 0.5px;
          border-bottom: 1.5px solid #dbe8d5; white-space: nowrap;
        }
        .eng-results-table td { padding: 9px 12px; border-bottom: 1px solid #f0f6ec; color: #243830; vertical-align: middle; }
        .eng-results-table tbody tr { cursor: pointer; transition: background 0.1s; }
        .eng-results-table tbody tr:hover { background: #eef9f0; }
        .eng-results-empty { text-align: center; padding: 28px 12px; color: #96b8a0; font-size: 12.5px; }

        .eng-input-wrap { position: relative; display: flex; }
        .eng-input-wrap .eng-input { border-radius: 7px 0 0 7px; }
        .eng-input-btn {
          height: 36px; padding: 0 10px; flex-shrink: 0;
          background: #edf5ea; border: 1.5px solid #d4e8cc; border-left: none;
          border-radius: 0 7px 7px 0; display: flex; align-items: center;
          justify-content: center; gap: 5px;
          cursor: pointer; color: #3a6048;
          font-family: 'Inter', sans-serif; font-size: 11.5px; font-weight: 500;
          transition: background 0.12s; white-space: nowrap;
        }
        .eng-input-btn:hover { background: #ddf0e0; }

        .eng-feedback {
          display: flex; align-items: center; gap: 9px; padding: 11px 15px;
          border-radius: 9px; font-size: 13px; animation: engFadeIn 0.2s ease;
          margin-bottom: 14px;
        }
        .eng-feedback.success { background: #f0faf2; border: 1px solid #b4dec0; color: #1e6030; }
        .eng-feedback.error   { background: #fff5f5; border: 1px solid #f8c0c0; border-left: 3px solid #e05252; color: #b91c1c; }
        .eng-feedback.info    { background: #f0f8ff; border: 1px solid #c7def8; border-left: 3px solid #4a90d9; color: #1a4070; }

        @keyframes spin { to { transform: rotate(360deg); } }
        .eng-spinner {
          width: 14px; height: 14px; flex-shrink: 0;
          border: 2px solid rgba(223,240,226,0.3); border-top-color: #dff0e2;
          border-radius: 50%; animation: spin 0.65s linear infinite;
        }
        .eng-spinner-dark {
          width: 14px; height: 14px; flex-shrink: 0;
          border: 2px solid #d4e8cc; border-top-color: #3e9654;
          border-radius: 50%; animation: spin 0.65s linear infinite;
        }
        @keyframes engFadeIn { from { opacity: 0; transform: translateY(-4px); } to { opacity: 1; transform: translateY(0); } }
      `}</style>

      <div className="eng-root">

        <header className="eng-topbar">
          <div className="eng-topbar-left">
            <div className="eng-logo-mark">
              <svg width="15" height="15" viewBox="0 0 18 18" fill="none">
                <rect x="1.5" y="1.5" width="6" height="6" rx="1.2" fill="rgba(255,255,255,0.9)" />
                <rect x="10.5" y="1.5" width="6" height="6" rx="1.2" fill="rgba(255,255,255,0.4)" />
                <rect x="1.5" y="10.5" width="6" height="6" rx="1.2" fill="rgba(255,255,255,0.4)" />
                <rect x="10.5" y="10.5" width="6" height="6" rx="1.2" fill="rgba(255,255,255,0.7)" />
              </svg>
            </div>
            <span className="eng-app-name">
              Venture<span className="eng-app-sub">ERP &amp; Soluções</span>
            </span>
            <span className="eng-screen-title">VENG0204 — Cadastro de Regras de Variáveis Equivalentes</span>
          </div>
        </header>

        <div className="eng-actionbar">
          <div className="eng-action-group">
            <span className="eng-action-label">Cadastro</span>
            <button className="eng-btn eng-btn-new" onClick={handleNovo} disabled={isSaving}>
              <svg width="12" height="12" viewBox="0 0 12 12" fill="none">
                <path d="M6 2v8M2 6h8" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" />
              </svg>
              Novo
            </button>
          </div>
          <div className="eng-action-group">
            <span className="eng-action-label">Ações</span>
            <button className="eng-btn eng-btn-primary" onClick={() => void handleSalvar()} disabled={isSaving}>
              {isSaving ? <><div className="eng-spinner" />Salvando...</> : <><svg width="13" height="13" viewBox="0 0 16 16" fill="none"><path d="M2 2h9l3 3v9a1 1 0 01-1 1H3a1 1 0 01-1-1V3a1 1 0 011-1z" stroke="currentColor" strokeWidth="1.4" strokeLinejoin="round" /><path d="M5 2v4h6V2M5 9h6" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" /></svg>Salvar</>}
            </button>
            <button className="eng-btn eng-btn-danger" onClick={handleLimpar} disabled={isSaving}>
              <svg width="13" height="13" viewBox="0 0 16 16" fill="none"><path d="M3 3l10 10M13 3L3 13" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" /></svg>
              Limpar
            </button>
          </div>
          <div className="eng-action-group">
            <button className="eng-btn eng-btn-ghost">
              <svg width="13" height="13" viewBox="0 0 16 16" fill="none"><circle cx="8" cy="8" r="6" stroke="currentColor" strokeWidth="1.4" /><path d="M8 7v4M8 5.5h.01" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" /></svg>
              Ajuda
            </button>
          </div>
        </div>

        <div className="eng-body">

          {feedback && (
            <div className={`eng-feedback ${feedback.type}`}>
              <svg width="15" height="15" viewBox="0 0 16 16" fill="none">
                {feedback.type === "success"
                  ? <path d="M3 8l3.5 3.5L13 5" stroke="#1e6030" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
                  : feedback.type === "error"
                    ? <><circle cx="8" cy="8" r="6" stroke="#e05252" strokeWidth="1.4" /><path d="M8 5v3.5M8 10.5h.01" stroke="#e05252" strokeWidth="1.4" strokeLinecap="round" /></>
                    : <><circle cx="8" cy="8" r="6" stroke="#4a90d9" strokeWidth="1.4" /><path d="M8 7v4M8 5.5h.01" stroke="#4a90d9" strokeWidth="1.4" strokeLinecap="round" /></>}
              </svg>
              {feedback.message}
            </div>
          )}

          {/* ═══════════════════════════════════════════════════════════ */}
          {/* SEÇÃO 1 — PESQUISAR                                         */}
          {/* ═══════════════════════════════════════════════════════════ */}

          <div className="eng-section-banner">
            <span className="eng-section-pill">1 — Pesquisar</span>
            <div className="eng-section-line" />
            <span className="eng-section-hint">Filtre por Item Pai e/ou Item Filho</span>
          </div>

          <div className="eng-card">
            <div className="eng-card-header">
              <div className="eng-card-header-left">
                <svg width="14" height="14" viewBox="0 0 16 16" fill="none">
                  <circle cx="6.5" cy="6.5" r="4.5" stroke="#3e9654" strokeWidth="1.4" />
                  <path d="M10 10l3.5 3.5" stroke="#3e9654" strokeWidth="1.4" strokeLinecap="round" />
                </svg>
                <span className="eng-card-title">Pesquisa de Regras de Equivalência</span>
              </div>
            </div>

            <div className="eng-card-body" style={{ paddingBottom: 14 }}>
              <div className="eng-filter-row">
                <div className="eng-field" style={{ flex: "0 0 220px" }}>
                  <label className="eng-label">Item Pai</label>
                  <select className="eng-select" value={filtroItemPai} onChange={e => setFiltroItemPai(e.target.value)}>
                    <option value="">Todos</option>
                    {MOCK_ITENS.map(i => <option key={i.value} value={i.value}>{i.label}</option>)}
                  </select>
                </div>
                <div className="eng-field" style={{ flex: "0 0 220px" }}>
                  <label className="eng-label">Item Filho</label>
                  <select className="eng-select" value={filtroItemFilho} onChange={e => setFiltroItemFilho(e.target.value)}>
                    <option value="">Todos</option>
                    {MOCK_ITENS.map(i => <option key={i.value} value={i.value}>{i.label}</option>)}
                  </select>
                </div>
                <div style={{ alignSelf: "flex-end" }}>
                  <button className="eng-btn eng-btn-ghost" onClick={() => void handlePesquisar()} disabled={isSearching}>
                    {isSearching ? <><div className="eng-spinner-dark" />Buscando...</> : <><svg width="13" height="13" viewBox="0 0 16 16" fill="none"><circle cx="6.5" cy="6.5" r="4.5" stroke="currentColor" strokeWidth="1.4" /><path d="M10 10l3.5 3.5" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" /></svg>Pesquisar</>}
                  </button>
                </div>
              </div>
            </div>

            {mostrarResultados && (
              <div className="eng-results-wrap">
                <div className="eng-results-bar">
                  <div className="eng-results-bar-left">
                    <svg width="13" height="13" viewBox="0 0 16 16" fill="none"><path d="M2 4h12M2 8h12M2 12h8" stroke="#5a8068" strokeWidth="1.4" strokeLinecap="round" /></svg>
                    <span className="eng-results-bar-label">Resultados</span>
                    <span className="eng-card-badge">{resultados.length} registro(s)</span>
                  </div>
                  <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                    <span className="eng-results-hint">↓ Clique em um registro para editar</span>
                    <button className="eng-btn eng-btn-ghost eng-btn-sm" onClick={() => setMostrarResultados(false)}>Fechar</button>
                  </div>
                </div>

                {resultados.length === 0 ? (
                  <div className="eng-results-empty">Nenhuma regra encontrada.</div>
                ) : (
                  <table className="eng-results-table">
                    <thead>
                      <tr>
                        <th style={{ width: 70 }}>Código</th>
                        <th>Item Pai</th>
                        <th>UM</th>
                        <th>Item Filho</th>
                        <th style={{ width: 60 }}>Seq</th>
                        <th>Caract. Pai</th>
                        <th>Oper. Pai</th>
                        <th>Caract. Filho</th>
                        <th>Oper. Filho</th>
                      </tr>
                    </thead>
                    <tbody>
                      {resultados.map(r => (
                        <tr key={r.codigo} onClick={() => handleSelectFromList(r)}>
                          <td style={{ fontWeight: 600, color: "#1a4a2a" }}>{r.codigo}</td>
                          <td>{r.item_pai}</td>
                          <td>{r.um}</td>
                          <td>{r.item_filho}</td>
                          <td>{r.seq}</td>
                          <td>{r.config_pai_caracteristica || "—"}</td>
                          <td>{r.config_pai_operador || "—"}</td>
                          <td>{r.config_filho_caracteristica || "—"}</td>
                          <td>{r.config_filho_operador || "—"}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                )}
              </div>
            )}
          </div>

          {/* ═══════════════════════════════════════════════════════════ */}
          {/* SEÇÃO 2 — CRIAR / EDITAR                                   */}
          {/* ═══════════════════════════════════════════════════════════ */}

          <div className="eng-section-banner">
            <span className="eng-section-pill">2 — Criar / Editar</span>
            <div className="eng-section-line" />
            <span className="eng-section-hint">{codigoEdit ? `Editando regra #${codigoEdit}` : "Preencha os campos e clique em Salvar"}</span>
          </div>

          <div className="eng-card">
            <div className="eng-card-header">
              <div className="eng-card-header-left">
                <svg width="14" height="14" viewBox="0 0 16 16" fill="none">
                  <path d="M2 2h9l3 3v9a1 1 0 01-1 1H3a1 1 0 01-1-1V3a1 1 0 011-1z" stroke="#3e9654" strokeWidth="1.4" strokeLinejoin="round" />
                  <path d="M5 2v4h6V2M5 9h6" stroke="#3e9654" strokeWidth="1.4" strokeLinecap="round" />
                </svg>
                <span className="eng-card-title">Regra de Equivalência</span>
              </div>
              {codigoEdit
                ? <span style={{ fontSize: 11, fontWeight: 600, color: '#7a5200', background: '#fff8e0', border: '1px solid #e0c860', borderRadius: 20, padding: '3px 10px', display: 'inline-flex', alignItems: 'center', gap: 5 }}>Editando #{codigoEdit}</span>
                : <span style={{ fontSize: 11, fontWeight: 600, color: '#1e5818', background: '#e8f5e0', border: '1px solid #a8d898', borderRadius: 20, padding: '3px 10px' }}>Novo Cadastro</span>
              }
            </div>

            <div className="eng-card-body">
              <div className="eng-grid">

                {/* Código */}
                <div className="eng-field eng-col-2">
                  <label className="eng-label">Código</label>
                  <input className="eng-input" disabled value={codigoEdit != null ? String(codigoEdit) : "Automático"} />
                  <span className="eng-field-hint">Gerado automaticamente ao salvar.</span>
                </div>

                {/* Item Pai */}
                <div className="eng-field eng-col-3">
                  <label className="eng-label">Item Pai <span className="eng-label-req">*</span></label>
                  <select className={`eng-select${errors.item_pai ? " has-error" : ""}`} value={form.item_pai} onChange={e => setField("item_pai", e.target.value)}>
                    <option value="">Selecione...</option>
                    {MOCK_ITENS.map(i => <option key={i.value} value={i.value}>{i.label}</option>)}
                  </select>
                  {errors.item_pai && <span className="eng-field-error">{errors.item_pai}</span>}
                </div>

                {/* UM */}
                <div className="eng-field eng-col-2">
                  <label className="eng-label">UM</label>
                  <input className="eng-input" disabled value={form.um || (itemPaiData?.um ?? "")} />
                  <span className="eng-field-hint">Preenchido automaticamente.</span>
                </div>

                {/* Item Filho */}
                <div className="eng-field eng-col-3">
                  <label className="eng-label">Item Filho <span className="eng-label-req">*</span></label>
                  <select className={`eng-select${errors.item_filho ? " has-error" : ""}`} value={form.item_filho} onChange={e => setField("item_filho", e.target.value)}>
                    <option value="">Selecione...</option>
                    {MOCK_ITENS.map(i => <option key={i.value} value={i.value}>{i.label}</option>)}
                  </select>
                  {errors.item_filho && <span className="eng-field-error">{errors.item_filho}</span>}
                </div>

                {/* Seq */}
                <div className="eng-field eng-col-2">
                  <label className="eng-label">Seq <span className="eng-label-req">*</span></label>
                  <input className={`eng-input${errors.seq ? " has-error" : ""}`} type="number" min={1} value={form.seq} onChange={e => setField("seq", Number(e.target.value))} />
                  {errors.seq && <span className="eng-field-error">{errors.seq}</span>}
                </div>
              </div>

              <div className="eng-section-sep" />

              <div className="eng-section-label">Configuração Pai</div>
              <div className="eng-grid">
                <div className="eng-field eng-col-5">
                  <label className="eng-label">Característica</label>
                  <select className="eng-select" value={form.config_pai_caracteristica} onChange={e => setField("config_pai_caracteristica", e.target.value)}>
                    <option value="">Selecione...</option>
                    {MOCK_CARACTERISTICAS.map(c => <option key={c.value} value={c.value}>{c.label}</option>)}
                  </select>
                </div>
                <div className="eng-field eng-col-5">
                  <label className="eng-label">Operador</label>
                  <select className="eng-select" value={form.config_pai_operador} onChange={e => setField("config_pai_operador", e.target.value)}>
                    {MOCK_OPERADORES.map(o => <option key={o.value} value={o.value}>{o.label}</option>)}
                  </select>
                </div>
              </div>

              <div className="eng-section-sep" />

              <div className="eng-section-label">Configuração Filho</div>
              <div className="eng-grid">
                <div className="eng-field eng-col-5">
                  <label className="eng-label">Característica</label>
                  <select className="eng-select" value={form.config_filho_caracteristica} onChange={e => setField("config_filho_caracteristica", e.target.value)}>
                    <option value="">Selecione...</option>
                    {MOCK_CARACTERISTICAS.map(c => <option key={c.value} value={c.value}>{c.label}</option>)}
                  </select>
                </div>
                <div className="eng-field eng-col-5">
                  <label className="eng-label">Operador</label>
                  <div style={{ display: "flex", gap: 6, alignItems: "flex-end" }}>
                    <select className="eng-select" style={{ flex: 1 }} value={form.config_filho_operador} onChange={e => setField("config_filho_operador", e.target.value)}>
                      {MOCK_OPERADORES.map(o => <option key={o.value} value={o.value}>{o.label}</option>)}
                    </select>
                    <button className="eng-btn-f" title="Fórmula">F</button>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </>
  );
}
