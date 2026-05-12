import { useState, useCallback } from "react";
import {
  type GrupoPDM_Response,
} from "@/services/pdmService";

// ─── Constants ────────────────────────────────────────────────────────────────

const MOCK_GRUPOS: GrupoPDM_Response[] = [
  { grupo_pdm: "GRP001", descricao: "Matérias-primas metálicas", abrev: "MPM", empresas: [{ empresa: "01" }] },
  { grupo_pdm: "GRP002", descricao: "Componentes plásticos", abrev: "CPL", empresas: [{ empresa: "01" }, { empresa: "02" }] },
  { grupo_pdm: "GRP003", descricao: "Parafusos e fixadores", abrev: "PFX", empresas: [{ empresa: "01", item_base: "IB001" }] },
  { grupo_pdm: "GRP004", descricao: "Componentes eletrônicos", abrev: "CEL", empresas: [{ empresa: "02" }] },
  { grupo_pdm: "GRP005", descricao: "Embalagens", abrev: "EMB", empresas: [{ empresa: "01" }, { empresa: "03" }] },
];

const MOCK_EMPRESAS = ["01 - Matriz", "02 - Filial SP", "03 - Filial RJ"];
const MOCK_ITENS = ["IB001 - Base Aço", "IB002 - Base Plástico", "IB003 - Base Alumínio"];

// ─── Types ────────────────────────────────────────────────────────────────────

type ModoForm = "novo" | "edicao";

type FeedbackState = {
  type: "success" | "error" | "info";
  message: string;
} | null;

interface FormGrupo {
  grupo_pdm: string;
  descricao: string;
  abrev: string;
}

interface EmpresaVinculoLocal {
  empresa: string;
  item_base: string;
}

const FORM_INICIAL: FormGrupo = {
  grupo_pdm: "",
  descricao: "",
  abrev: "",
};

// ─── Helpers ──────────────────────────────────────────────────────────────────

// ─── Component ────────────────────────────────────────────────────────────────

export function Vite0114Page(): JSX.Element {
  const [form, setForm] = useState<FormGrupo>(FORM_INICIAL);
  const [modoForm, setModoForm] = useState<ModoForm>("novo");
  const [grupoEdit, setGrupoEdit] = useState<string | null>(null);
  const [errors, setErrors] = useState<Partial<Record<keyof FormGrupo, string>>>({});
  const [empresas, setEmpresas] = useState<EmpresaVinculoLocal[]>([]);
  const [showItemModal, setShowItemModal] = useState(false);
  const [itemEmpresa, setItemEmpresa] = useState("");
  const [itemBase, setItemBase] = useState("");

  const [filtroGrupo, setFiltroGrupo] = useState("");
  const [filtroDesc, setFiltroDesc] = useState("");
  const [resultados, setResultados] = useState<GrupoPDM_Response[]>([]);
  const [mostrarResultados, setMostrarResultados] = useState(false);

  const [isSaving, setIsSaving] = useState(false);
  const [isSearching, setIsSearching] = useState(false);
  const [feedback, setFeedback] = useState<FeedbackState>(null);

  const setField = useCallback(
    <K extends keyof FormGrupo>(key: K, value: FormGrupo[K]) => {
      setForm((prev) => ({ ...prev, [key]: value }));
      setErrors((prev) => ({ ...prev, [key]: undefined }));
      setFeedback(null);
    },
    [],
  );

  function validate(): boolean {
    const e: Partial<Record<keyof FormGrupo, string>> = {};
    if (!form.grupo_pdm.trim()) e.grupo_pdm = "Grupo PDM obrigatório.";
    if (!form.descricao.trim()) e.descricao = "Descrição obrigatória.";
    if (!form.abrev.trim()) e.abrev = "Abreviatura obrigatória.";
    setErrors(e);
    return Object.keys(e).length === 0;
  }

  function handlePesquisar() {
    setIsSearching(true);
    setFeedback(null);
    setTimeout(() => {
      let results = MOCK_GRUPOS;
      if (filtroGrupo.trim()) {
        results = results.filter((g) =>
          g.grupo_pdm.toLowerCase().includes(filtroGrupo.toLowerCase()),
        );
      }
      if (filtroDesc.trim()) {
        results = results.filter((g) =>
          g.descricao.toLowerCase().includes(filtroDesc.toLowerCase()),
        );
      }
      setResultados(results);
      setMostrarResultados(true);
      setIsSearching(false);
      if (results.length === 0) {
        setFeedback({ type: "info", message: "Nenhum grupo PDM encontrado." });
      }
    }, 400);
  }

  function handleSelectFromList(g: GrupoPDM_Response) {
    setForm({ grupo_pdm: g.grupo_pdm, descricao: g.descricao, abrev: g.abrev });
    setEmpresas(
      g.empresas.map((e) => ({ empresa: e.empresa, item_base: e.item_base ?? "" })),
    );
    setFeedback(null);
    setErrors({});
    setModoForm("edicao");
    setGrupoEdit(g.grupo_pdm);
    window.scrollTo({ top: document.body.scrollHeight, behavior: "smooth" });
  }

  function handleSalvar() {
    if (!validate()) return;
    setIsSaving(true);
    setFeedback(null);
    setTimeout(() => {
      setIsSaving(false);
      setFeedback({
        type: "success",
        message: `Grupo PDM ${form.grupo_pdm} — ${form.descricao} salvo com sucesso.`,
      });
    }, 600);
  }

  function handleNovo() {
    setForm(FORM_INICIAL);
    setErrors({});
    setFeedback(null);
    setEmpresas([]);
    setItemEmpresa("");
    setItemBase("");
    setModoForm("novo");
    setGrupoEdit(null);
  }

  function handleLimpar() {
    handleNovo();
    setMostrarResultados(false);
  }

  function adicionarItem() {
    if (!itemEmpresa.trim()) return;
    setEmpresas((p) => [...p, { empresa: itemEmpresa.trim(), item_base: itemBase.trim() }]);
    setItemEmpresa("");
    setItemBase("");
    setShowItemModal(false);
  }

  return (
    <>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Inter:wght@300;400;500;600&display=swap');
        *, *::before, *::after { box-sizing: border-box; margin: 0; padding: 0; }

        .pdm-root {
          min-height: 100vh; background: #f0f4f7;
          font-family: 'Inter', sans-serif; color: #1a2533;
          display: flex; flex-direction: column;
        }

        .pdm-topbar {
          height: 52px; background: #1a2738;
          display: flex; align-items: center; justify-content: space-between;
          padding: 0 20px; flex-shrink: 0;
          border-bottom: 1px solid rgba(68,140,200,0.15);
        }
        .pdm-topbar-left { display: flex; align-items: center; gap: 10px; }
        .pdm-logo-mark {
          width: 28px; height: 28px; background: #3b82c4;
          border-radius: 6px; display: flex; align-items: center; justify-content: center;
        }
        .pdm-app-name { font-size: 13px; font-weight: 600; color: #dce8f4; line-height: 1.1; }
        .pdm-app-sub  { display: block; font-size: 9px; font-weight: 400; color: #3d6080; }
        .pdm-screen-title {
          font-size: 12.5px; font-weight: 500; color: #5a96c0;
          padding-left: 14px; margin-left: 14px;
          border-left: 1px solid rgba(255,255,255,0.08);
        }

        .pdm-actionbar {
          background: #fff; border-bottom: 1px solid #d5e0e8;
          padding: 0 20px; display: flex; align-items: center;
          gap: 4px; height: 46px; flex-shrink: 0;
        }
        .pdm-action-group {
          display: flex; align-items: center; gap: 4px;
          padding-right: 12px; margin-right: 8px;
          border-right: 1px solid #e4ecf2;
        }
        .pdm-action-group:last-child { border-right: none; }
        .pdm-action-label {
          font-size: 9.5px; font-weight: 600; letter-spacing: 0.8px;
          text-transform: uppercase; color: #90a8c0; margin-right: 4px; white-space: nowrap;
        }
        .pdm-btn {
          display: inline-flex; align-items: center; gap: 6px;
          height: 32px; padding: 0 12px; border: 1.5px solid transparent;
          border-radius: 7px; font-family: 'Inter', sans-serif;
          font-size: 12.5px; font-weight: 500; cursor: pointer; white-space: nowrap;
          transition: background 0.13s, border-color 0.13s, color 0.13s;
        }
        .pdm-btn:disabled { opacity: 0.5; cursor: not-allowed; }
        .pdm-btn-primary { background: #1a2738; color: #d8e8f8; border-color: #1a2738; }
        .pdm-btn-primary:hover:not(:disabled) { background: #233550; }
        .pdm-btn-ghost { background: transparent; color: #4a6880; border-color: #ccdce8; }
        .pdm-btn-ghost:hover:not(:disabled) { background: #edf4fa; border-color: #a0c0d8; color: #1a3048; }
        .pdm-btn-danger { background: transparent; color: #b94040; border-color: #f0c8c8; }
        .pdm-btn-danger:hover:not(:disabled) { background: #fff0f0; border-color: #e09090; }
        .pdm-btn-sm { height: 28px; padding: 0 9px; font-size: 12px; }
        .pdm-btn-info { background: #edf4fa; color: #1a4880; border-color: #a8c8e0; font-weight: 600; }
        .pdm-btn-info:hover:not(:disabled) { background: #dce8f4; border-color: #80b0d8; }

        .pdm-body {
          flex: 1; padding: 16px 20px; display: flex;
          flex-direction: column; gap: 0; overflow-y: auto;
        }
        .pdm-body::-webkit-scrollbar { width: 5px; }
        .pdm-body::-webkit-scrollbar-thumb { background: #c8d8e8; border-radius: 4px; }

        .pdm-section-banner {
          display: flex; align-items: center; gap: 10px;
          padding: 14px 0 8px;
        }
        .pdm-section-banner:first-child { padding-top: 0; }
        .pdm-section-banner-pill {
          font-size: 9.5px; font-weight: 700; letter-spacing: 1.2px;
          text-transform: uppercase; color: #4a7498;
          background: #dce8f4; border: 1px solid #c0d4e8;
          border-radius: 20px; padding: 3px 10px; white-space: nowrap;
        }
        .pdm-section-banner-line { flex: 1; height: 1px; background: #d5e0e8; }
        .pdm-section-banner-hint { font-size: 11px; color: #90a8c0; white-space: nowrap; }

        .pdm-card {
          background: #fff; border: 1px solid #d5e0e8;
          border-radius: 12px; overflow: hidden; margin-bottom: 14px;
        }
        .pdm-card-header {
          display: flex; align-items: center; justify-content: space-between;
          padding: 12px 18px; border-bottom: 1px solid #e8eff4; background: #f8fafc;
        }
        .pdm-card-header-left { display: flex; align-items: center; gap: 8px; }
        .pdm-card-title { font-size: 12px; font-weight: 600; color: #2a3d54; text-transform: uppercase; letter-spacing: 0.6px; }
        .pdm-card-badge {
          font-size: 10.5px; font-weight: 500; color: #3b82c4;
          background: #edf4fa; border: 1px solid #b8d0e8; border-radius: 12px; padding: 2px 8px;
        }
        .pdm-card-body { padding: 18px 18px; }

        .pdm-modo-novo {
          display: inline-flex; align-items: center; gap: 5px;
          font-size: 11px; font-weight: 600; padding: 3px 10px;
          border-radius: 20px; background: #e0eef8; color: #1a4070;
          border: 1px solid #90c0e8;
        }
        .pdm-modo-edicao {
          display: inline-flex; align-items: center; gap: 5px;
          font-size: 11px; font-weight: 600; padding: 3px 10px;
          border-radius: 20px; background: #f8f0e0; color: #7a5200;
          border: 1px solid #e0c860;
        }
        .pdm-modo-dot {
          width: 6px; height: 6px; border-radius: 50%; flex-shrink: 0;
        }
        .pdm-modo-novo  .pdm-modo-dot { background: #3b82c4; }
        .pdm-modo-edicao .pdm-modo-dot { background: #c8a020; }

        .pdm-filter-row { display: flex; align-items: flex-end; gap: 12px; flex-wrap: wrap; }

        .pdm-grid { display: grid; grid-template-columns: repeat(12, 1fr); gap: 16px 14px; align-items: start; }
        .pdm-col-2  { grid-column: span 2; }
        .pdm-col-3  { grid-column: span 3; }
        .pdm-col-4  { grid-column: span 4; }
        .pdm-col-6  { grid-column: span 6; }
        .pdm-col-8  { grid-column: span 8; }
        .pdm-col-12 { grid-column: span 12; }

        .pdm-field { display: flex; flex-direction: column; gap: 5px; }
        .pdm-label {
          font-size: 10.5px; font-weight: 600; color: #546e88;
          text-transform: uppercase; letter-spacing: 0.4px;
          display: flex; align-items: center; gap: 4px;
        }
        .pdm-label-req { color: #c84040; font-size: 12px; line-height: 1; }
        .pdm-input {
          width: 100%; height: 36px; background: #f4f8fc;
          border: 1.5px solid #c8dae8; border-radius: 7px;
          padding: 0 10px; font-family: 'Inter', sans-serif;
          font-size: 13px; color: #1a2533; outline: none;
          transition: border-color 0.13s, box-shadow 0.13s;
        }
        .pdm-input:focus { border-color: #3b82c4; box-shadow: 0 0 0 2px rgba(59,130,196,0.1); }
        .pdm-input::placeholder { color: #a8c0d8; font-size: 12px; }
        .pdm-input.has-error { border-color: #e05252; box-shadow: 0 0 0 2px rgba(224,82,82,0.1); }

        .pdm-select {
          width: 100%; height: 36px; background: #f4f8fc;
          border: 1.5px solid #c8dae8; border-radius: 7px;
          padding: 0 28px 0 10px; font-family: 'Inter', sans-serif;
          font-size: 13px; color: #1a2533; outline: none;
          appearance: none; cursor: pointer;
          background-image: url("data:image/svg+xml,%3Csvg width='10' height='6' viewBox='0 0 10 6' xmlns='http://www.w3.org/2000/svg'%3E%3Cpath d='M1 1l4 4 4-4' stroke='%23708898' stroke-width='1.5' fill='none' stroke-linecap='round' stroke-linejoin='round'/%3E%3C/svg%3E");
          background-repeat: no-repeat; background-position: right 10px center;
          transition: border-color 0.13s;
        }
        .pdm-select:focus { border-color: #3b82c4; box-shadow: 0 0 0 2px rgba(59,130,196,0.1); }

        .pdm-field-error { font-size: 11px; color: #c84040; margin-top: 2px; display: flex; align-items: center; gap: 4px; }
        .pdm-field-hint  { font-size: 11px; color: #7490a8; margin-top: 2px; line-height: 1.45; }

        .pdm-results-wrap { border-top: 1px solid #e8eff4; overflow-x: auto; }
        .pdm-results-bar {
          display: flex; align-items: center; justify-content: space-between;
          padding: 10px 18px; background: #f4f8fc; border-bottom: 1px solid #e8eff4;
        }
        .pdm-results-bar-left { display: flex; align-items: center; gap: 8px; }
        .pdm-results-bar-label { font-size: 11px; font-weight: 600; color: #4a6880; text-transform: uppercase; letter-spacing: 0.5px; }
        .pdm-results-hint { font-size: 11px; color: #90a8c0; }
        .pdm-results-table { width: 100%; border-collapse: collapse; font-size: 13px; }
        .pdm-results-table th {
          background: #f4f8fc; padding: 8px 12px; text-align: left;
          font-size: 10.5px; font-weight: 700; color: #546e88;
          text-transform: uppercase; letter-spacing: 0.5px;
          border-bottom: 1.5px solid #d5e0e8; white-space: nowrap;
        }
        .pdm-results-table td { padding: 9px 12px; border-bottom: 1px solid #eef4f8; color: #203040; vertical-align: middle; }
        .pdm-results-table tbody tr { cursor: pointer; transition: background 0.1s; }
        .pdm-results-table tbody tr:hover { background: #edf4fa; }
        .pdm-results-empty { text-align: center; padding: 28px 12px; color: #90a8c0; font-size: 12.5px; }

        .pdm-feedback {
          display: flex; align-items: center; gap: 9px; padding: 11px 15px;
          border-radius: 9px; font-size: 13px; animation: pdmFadeIn 0.2s ease;
          margin-bottom: 14px;
        }
        .pdm-feedback.success { background: #f0faf4; border: 1px solid #b4dcc4; color: #1e6030; }
        .pdm-feedback.error   { background: #fff5f5; border: 1px solid #f8c0c0; border-left: 3px solid #e05252; color: #b91c1c; }
        .pdm-feedback.info    { background: #f0f4ff; border: 1px solid #c0d0f8; border-left: 3px solid #4868c4; color: #1a3070; }

        .pdm-footer {
          background: #fff; border-top: 1px solid #d5e0e8;
          padding: 8px 20px; display: flex; align-items: center;
          justify-content: space-between; flex-shrink: 0;
        }
        .pdm-footer-left { display: flex; align-items: center; gap: 20px; }
        .pdm-footer-stat { display: flex; align-items: center; gap: 6px; font-size: 11.5px; color: #6a84a0; }
        .pdm-footer-stat strong { color: #1a2533; font-weight: 600; }

        .pdm-modal-overlay {
          position: fixed; inset: 0; background: rgba(0,0,0,0.5);
          display: flex; align-items: center; justify-content: center;
          z-index: 1000; animation: pdmFadeIn 0.15s ease;
        }
        .pdm-modal {
          background: #fff; border-radius: 12px; width: 440px; max-width: 90vw;
          box-shadow: 0 20px 60px rgba(0,0,0,0.2); overflow: hidden;
        }
        .pdm-modal-header {
          padding: 14px 18px; border-bottom: 1px solid #e8eff4;
          display: flex; align-items: center; justify-content: space-between;
          font-size: 13px; font-weight: 600; color: #1a2738;
        }
        .pdm-modal-body { padding: 20px 18px; display: flex; flex-direction: column; gap: 14px; }
        .pdm-modal-footer { padding: 12px 18px; border-top: 1px solid #e8eff4; display: flex; justify-content: flex-end; gap: 8px; }

        .pdm-check-group { display: flex; align-items: center; gap: 6px; }
        .pdm-check-group label { font-size: 13px; color: #203040; cursor: pointer; display: flex; align-items: center; gap: 5px; }

        @keyframes spin { to { transform: rotate(360deg); } }
        .pdm-spinner {
          width: 14px; height: 14px; flex-shrink: 0;
          border: 2px solid rgba(216,232,248,0.3); border-top-color: #d8e8f8;
          border-radius: 50%; animation: spin 0.65s linear infinite;
        }
        .pdm-spinner-dark {
          width: 14px; height: 14px; flex-shrink: 0;
          border: 2px solid #c8dae8; border-top-color: #3b82c4;
          border-radius: 50%; animation: spin 0.65s linear infinite;
        }
        @keyframes pdmFadeIn { from { opacity: 0; transform: translateY(-4px); } to { opacity: 1; transform: translateY(0); } }
      `}</style>

      <div className="pdm-root">
        <header className="pdm-topbar">
          <div className="pdm-topbar-left">
            <div className="pdm-logo-mark">
              <svg width="15" height="15" viewBox="0 0 18 18" fill="none">
                <rect x="1.5" y="1.5" width="6" height="6" rx="1.2" fill="rgba(255,255,255,0.9)" />
                <rect x="10.5" y="1.5" width="6" height="6" rx="1.2" fill="rgba(255,255,255,0.4)" />
                <rect x="1.5" y="10.5" width="6" height="6" rx="1.2" fill="rgba(255,255,255,0.4)" />
                <rect x="10.5" y="10.5" width="6" height="6" rx="1.2" fill="rgba(255,255,255,0.7)" />
              </svg>
            </div>
            <span className="pdm-app-name">
              Venture<span className="pdm-app-sub">ERP &amp; Soluções</span>
            </span>
            <span className="pdm-screen-title">VITE0114 — Cadastro de Grupos (PDM)</span>
          </div>
        </header>

        <div className="pdm-actionbar">
          <div className="pdm-action-group">
            <span className="pdm-action-label">Cadastro</span>
            <button className="pdm-btn pdm-btn-info" onClick={handleNovo} disabled={isSaving}>
              <svg width="12" height="12" viewBox="0 0 12 12" fill="none">
                <path d="M6 2v8M2 6h8" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" />
              </svg>
              Novo
            </button>
          </div>
          <div className="pdm-action-group">
            <span className="pdm-action-label">Ações</span>
            <button className="pdm-btn pdm-btn-primary" onClick={() => void handleSalvar()} disabled={isSaving}>
              {isSaving ? <><div className="pdm-spinner" />Salvando...</> : <>
                <svg width="13" height="13" viewBox="0 0 16 16" fill="none">
                  <path d="M2 2h9l3 3v9a1 1 0 01-1 1H3a1 1 0 01-1-1V3a1 1 0 011-1z" stroke="currentColor" strokeWidth="1.4" strokeLinejoin="round" />
                  <path d="M5 2v4h6V2M5 9h6" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" />
                </svg>
                Salvar
              </>}
            </button>
            <button className="pdm-btn pdm-btn-danger" onClick={handleLimpar} disabled={isSaving}>
              <svg width="13" height="13" viewBox="0 0 16 16" fill="none">
                <path d="M3 3l10 10M13 3L3 13" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
              </svg>
              Limpar
            </button>
          </div>
          <div className="pdm-action-group">
            <button className="pdm-btn pdm-btn-ghost">
              <svg width="13" height="13" viewBox="0 0 16 16" fill="none">
                <circle cx="8" cy="8" r="6" stroke="currentColor" strokeWidth="1.4" />
                <path d="M8 7v4M8 5.5h.01" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" />
              </svg>
              Ajuda
            </button>
          </div>
        </div>

        <div className="pdm-body">
          {feedback && (
            <div className={`pdm-feedback ${feedback.type}`}>
              <svg width="15" height="15" viewBox="0 0 16 16" fill="none">
                {feedback.type === "success"
                  ? <path d="M3 8l3.5 3.5L13 5" stroke="#1e6030" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
                  : feedback.type === "error"
                    ? <><circle cx="8" cy="8" r="6" stroke="#e05252" strokeWidth="1.4" /><path d="M8 5v3.5M8 10.5h.01" stroke="#e05252" strokeWidth="1.4" strokeLinecap="round" /></>
                    : <><circle cx="8" cy="8" r="6" stroke="#4868c4" strokeWidth="1.4" /><path d="M8 7v4M8 5.5h.01" stroke="#4868c4" strokeWidth="1.4" strokeLinecap="round" /></>
                }
              </svg>
              {feedback.message}
            </div>
          )}

          {/* ═══ SEÇÃO 1 — PESQUISAR ═══ */}
          <div className="pdm-section-banner">
            <span className="pdm-section-banner-pill">1 — Pesquisar</span>
            <div className="pdm-section-banner-line" />
            <span className="pdm-section-banner-hint">Filtre a lista e clique em um registro para carregá-lo no formulário abaixo</span>
          </div>

          <div className="pdm-card">
            <div className="pdm-card-header">
              <div className="pdm-card-header-left">
                <svg width="14" height="14" viewBox="0 0 16 16" fill="none">
                  <circle cx="6.5" cy="6.5" r="4.5" stroke="#3b82c4" strokeWidth="1.4" />
                  <path d="M10 10l3.5 3.5" stroke="#3b82c4" strokeWidth="1.4" strokeLinecap="round" />
                </svg>
                <span className="pdm-card-title">Pesquisa de Grupos PDM</span>
              </div>
            </div>
            <div className="pdm-card-body" style={{ paddingBottom: 14 }}>
              <div className="pdm-filter-row">
                <div className="pdm-field" style={{ flex: "0 0 180px" }}>
                  <label className="pdm-label">Grupo PDM</label>
                  <input
                    className="pdm-input"
                    placeholder="Ex: GRP001"
                    value={filtroGrupo}
                    onChange={(e) => setFiltroGrupo(e.target.value)}
                    onKeyDown={(e) => e.key === "Enter" && void handlePesquisar()}
                  />
                </div>
                <div className="pdm-field" style={{ flex: "0 0 260px" }}>
                  <label className="pdm-label">Descrição</label>
                  <input
                    className="pdm-input"
                    placeholder="Parte da descrição"
                    value={filtroDesc}
                    onChange={(e) => setFiltroDesc(e.target.value)}
                    onKeyDown={(e) => e.key === "Enter" && void handlePesquisar()}
                  />
                </div>
                <div style={{ alignSelf: "flex-end" }}>
                  <button className="pdm-btn pdm-btn-ghost" onClick={() => void handlePesquisar()} disabled={isSearching}>
                    {isSearching ? <><div className="pdm-spinner-dark" />Buscando...</> : <>
                      <svg width="13" height="13" viewBox="0 0 16 16" fill="none">
                        <circle cx="6.5" cy="6.5" r="4.5" stroke="currentColor" strokeWidth="1.4" />
                        <path d="M10 10l3.5 3.5" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" />
                      </svg>
                      Pesquisar
                    </>}
                  </button>
                </div>
              </div>
            </div>

            {mostrarResultados && (
              <div className="pdm-results-wrap">
                <div className="pdm-results-bar">
                  <div className="pdm-results-bar-left">
                    <svg width="13" height="13" viewBox="0 0 16 16" fill="none">
                      <path d="M2 4h12M2 8h12M2 12h8" stroke="#546e88" strokeWidth="1.4" strokeLinecap="round" />
                    </svg>
                    <span className="pdm-results-bar-label">Resultados</span>
                    <span className="pdm-card-badge">{resultados.length} registro(s)</span>
                  </div>
                  <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                    <span className="pdm-results-hint">↓ Clique para carregar</span>
                    <button className="pdm-btn pdm-btn-ghost pdm-btn-sm" onClick={() => setMostrarResultados(false)}>Fechar</button>
                  </div>
                </div>
                {resultados.length === 0 ? (
                  <div className="pdm-results-empty">Nenhum grupo PDM encontrado para os filtros informados.</div>
                ) : (
                  <table className="pdm-results-table">
                    <thead>
                      <tr>
                        <th style={{ width: 120 }}>Grupo PDM</th>
                        <th>Descrição</th>
                        <th style={{ width: 100 }}>Abrev.</th>
                        <th style={{ width: 120 }}>Empresas</th>
                      </tr>
                    </thead>
                    <tbody>
                      {resultados.map((g) => (
                        <tr key={g.grupo_pdm} onClick={() => handleSelectFromList(g)}>
                          <td style={{ fontWeight: 600, color: "#1a4070" }}>{g.grupo_pdm}</td>
                          <td>{g.descricao}</td>
                          <td>{g.abrev}</td>
                          <td>{g.empresas.map((e) => e.empresa).join(", ") || "—"}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                )}
              </div>
            )}
          </div>

          {/* ═══ SEÇÃO 2 — CRIAR / EDITAR ═══ */}
          <div className="pdm-section-banner">
            <span className="pdm-section-banner-pill">2 — Criar / Editar</span>
            <div className="pdm-section-banner-line" />
            <span className="pdm-section-banner-hint">
              {modoForm === "novo" ? "Preencha os campos e clique em Salvar" : `Editando ${grupoEdit ?? "?"}`}
            </span>
          </div>

          <div className="pdm-card">
            <div className="pdm-card-header">
              <div className="pdm-card-header-left">
                <svg width="14" height="14" viewBox="0 0 16 16" fill="none">
                  <path d="M2 2h9l3 3v9a1 1 0 01-1 1H3a1 1 0 01-1-1V3a1 1 0 011-1z" stroke="#3b82c4" strokeWidth="1.4" strokeLinejoin="round" />
                  <path d="M5 2v4h6V2M5 9h6" stroke="#3b82c4" strokeWidth="1.4" strokeLinecap="round" />
                </svg>
                <span className="pdm-card-title">Grupo PDM</span>
              </div>
              {modoForm === "novo"
                ? <span className="pdm-modo-novo"><span className="pdm-modo-dot" />Novo Cadastro</span>
                : <span className="pdm-modo-edicao"><span className="pdm-modo-dot" />Editando {grupoEdit}</span>
              }
            </div>
            <div className="pdm-card-body">
              <div className="pdm-grid">
                <div className="pdm-field pdm-col-2">
                  <label className="pdm-label">Grupo PDM <span className="pdm-label-req">*</span></label>
                  <input
                    className={`pdm-input${errors.grupo_pdm ? " has-error" : ""}`}
                    placeholder="Ex: GRP001"
                    value={form.grupo_pdm}
                    onChange={(e) => setField("grupo_pdm", e.target.value.toUpperCase())}
                    maxLength={20}
                  />
                  {errors.grupo_pdm && <span className="pdm-field-error"><svg width="11" height="11" viewBox="0 0 12 12" fill="none"><circle cx="6" cy="6" r="5" stroke="#c84040" strokeWidth="1.2" /><path d="M6 4v2.5M6 8h.01" stroke="#c84040" strokeWidth="1.2" strokeLinecap="round" /></svg>{errors.grupo_pdm}</span>}
                </div>
                <div className="pdm-field pdm-col-6">
                  <label className="pdm-label">Descrição <span className="pdm-label-req">*</span></label>
                  <input
                    className={`pdm-input${errors.descricao ? " has-error" : ""}`}
                    placeholder="Ex: Matérias-primas metálicas"
                    value={form.descricao}
                    onChange={(e) => setField("descricao", e.target.value)}
                    maxLength={100}
                  />
                  {errors.descricao && <span className="pdm-field-error"><svg width="11" height="11" viewBox="0 0 12 12" fill="none"><circle cx="6" cy="6" r="5" stroke="#c84040" strokeWidth="1.2" /><path d="M6 4v2.5M6 8h.01" stroke="#c84040" strokeWidth="1.2" strokeLinecap="round" /></svg>{errors.descricao}</span>}
                </div>
                <div className="pdm-field pdm-col-2">
                  <label className="pdm-label">Abrev <span className="pdm-label-req">*</span></label>
                  <input
                    className={`pdm-input${errors.abrev ? " has-error" : ""}`}
                    placeholder="Ex: MPM"
                    value={form.abrev}
                    onChange={(e) => setField("abrev", e.target.value.toUpperCase())}
                    maxLength={10}
                  />
                  {errors.abrev && <span className="pdm-field-error"><svg width="11" height="11" viewBox="0 0 12 12" fill="none"><circle cx="6" cy="6" r="5" stroke="#c84040" strokeWidth="1.2" /><path d="M6 4v2.5M6 8h.01" stroke="#c84040" strokeWidth="1.2" strokeLinecap="round" /></svg>{errors.abrev}</span>}
                </div>
                <div className="pdm-field pdm-col-2" style={{ alignSelf: "flex-end", paddingBottom: 2 }}>
                  <button className="pdm-btn pdm-btn-info pdm-btn-sm" onClick={() => setShowItemModal(true)}>
                    <svg width="12" height="12" viewBox="0 0 12 12" fill="none">
                      <path d="M6 2v8M2 6h8" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" />
                    </svg>
                    Item
                  </button>
                </div>
              </div>

              {empresas.length > 0 && (
                <div style={{ marginTop: 18 }}>
                  <div style={{ fontSize: 10.5, fontWeight: 600, color: "#546e88", textTransform: "uppercase", letterSpacing: 0.4, marginBottom: 8 }}>
                    Empresas vinculadas ({empresas.length})
                  </div>
                  <table className="pdm-results-table">
                    <thead>
                      <tr>
                        <th style={{ width: 50 }}>#</th>
                        <th>Empresa</th>
                        <th>Item Base</th>
                        <th style={{ width: 80 }}></th>
                      </tr>
                    </thead>
                    <tbody>
                      {empresas.map((e, i) => (
                        <tr key={i}>
                          <td style={{ color: "#90a8c0", fontSize: 12 }}>{i + 1}</td>
                          <td style={{ fontWeight: 600 }}>{e.empresa}</td>
                          <td>{e.item_base || "—"}</td>
                          <td>
                            <button
                              style={{ background: "transparent", border: "none", cursor: "pointer", color: "#c89090", fontSize: 12 }}
                              onClick={() => setEmpresas((p) => p.filter((_, j) => j !== i))}
                            >
                              Remover
                            </button>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          </div>
        </div>

        <footer className="pdm-footer">
          <div className="pdm-footer-left">
            <div className="pdm-footer-stat">Grupo: <strong>{form.grupo_pdm || "—"}</strong></div>
            <div className="pdm-footer-stat">Desc: <strong>{form.descricao || "—"}</strong></div>
            <div className="pdm-footer-stat">Abrev: <strong>{form.abrev || "—"}</strong></div>
          </div>
          <div className="pdm-footer-stat">
            {modoForm === "novo"
              ? <span className="pdm-modo-novo" style={{ fontSize: 11 }}><span className="pdm-modo-dot" />Novo Cadastro</span>
              : <span className="pdm-modo-edicao" style={{ fontSize: 11 }}><span className="pdm-modo-dot" />Editando {grupoEdit}</span>
            }
          </div>
        </footer>

        {/* ── ITEM MODAL ── */}
        {showItemModal && (
          <div className="pdm-modal-overlay" onClick={() => setShowItemModal(false)}>
            <div className="pdm-modal" onClick={(e) => e.stopPropagation()}>
              <div className="pdm-modal-header">
                <span>Vincular Empresa / Item Base</span>
                <button
                  style={{ background: "none", border: "none", cursor: "pointer", fontSize: 16, color: "#90a8c0" }}
                  onClick={() => setShowItemModal(false)}
                >
                  ✕
                </button>
              </div>
              <div className="pdm-modal-body">
                <div className="pdm-field">
                  <label className="pdm-label">Empresa <span className="pdm-label-req">*</span></label>
                  <select className="pdm-select" value={itemEmpresa} onChange={(e) => setItemEmpresa(e.target.value)}>
                    <option value="">Selecione...</option>
                    {MOCK_EMPRESAS.map((e) => <option key={e} value={e}>{e}</option>)}
                  </select>
                </div>
                <div className="pdm-field">
                  <label className="pdm-label">Item Base</label>
                  <select className="pdm-select" value={itemBase} onChange={(e) => setItemBase(e.target.value)}>
                    <option value="">Selecione...</option>
                    {MOCK_ITENS.map((it) => <option key={it} value={it}>{it}</option>)}
                  </select>
                </div>
              </div>
              <div className="pdm-modal-footer">
                <button className="pdm-btn pdm-btn-ghost pdm-btn-sm" onClick={() => setShowItemModal(false)}>Cancelar</button>
                <button className="pdm-btn pdm-btn-primary pdm-btn-sm" onClick={adicionarItem}>Adicionar</button>
              </div>
            </div>
          </div>
        )}
      </div>
    </>
  );
}
