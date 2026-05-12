import { useState, useCallback } from "react";
import {
  criarTipoContrato,
  listarTiposContrato,
  type TipoContratoDTO,
  type TipoContratoResponse,
} from "@/services/contratosService";

// ─── Types ────────────────────────────────────────────────────────────────────

type FeedbackState = { type: "success" | "error" | "info"; message: string } | null;

interface FormTipo {
  descricao: string;
  tempo_determinado: string;
  ativo: boolean;
}

const FORM_INICIAL: FormTipo = { descricao: "", tempo_determinado: "Não", ativo: true };

const MOCK_TIPOS: TipoContratoResponse[] = [
  { codigo: "001", descricao: "Contrato de Compra", tempo_determinado: "Sim", ativo: true },
  { codigo: "002", descricao: "Contrato de Serviço", tempo_determinado: "Não", ativo: true },
  { codigo: "003", descricao: "Contrato de Fornecimento", tempo_determinado: "Sim", ativo: false },
];

// ─── Helpers ──────────────────────────────────────────────────────────────────

function normalizeError(error: unknown, fallback: string): string {
  if (error && typeof error === "object" && "response" in error) {
    const resp = (error as Record<string, unknown>).response as Record<string, unknown> | undefined;
    if (resp?.data && typeof resp.data === "object") {
      const d = resp.data as Record<string, unknown>;
      if (typeof d.message === "string") return d.message;
    }
  }
  return error instanceof Error ? error.message : fallback;
}

// ─── Component ────────────────────────────────────────────────────────────────

export function Vcon0100Page(): JSX.Element {
  const [form, setForm] = useState<FormTipo>(FORM_INICIAL);
  const [feedback, setFeedback] = useState<FeedbackState>(null);
  const [isSaving, setIsSaving] = useState(false);
  const [tipos, setTipos] = useState<TipoContratoResponse[]>(MOCK_TIPOS);
  const [showResults, setShowResults] = useState(false);

  const setField = useCallback(<K extends keyof FormTipo>(key: K, value: FormTipo[K]) => {
    setForm((p) => ({ ...p, [key]: value }));
    setFeedback(null);
  }, []);

  function validate(): boolean {
    if (!form.descricao.trim()) {
      setFeedback({ type: "error", message: "Descrição obrigatória." });
      return false;
    }
    return true;
  }

  async function handleSalvar() {
    if (!validate()) return;
    setIsSaving(true);
    setFeedback(null);
    try {
      const dto: TipoContratoDTO = {
        descricao: form.descricao.trim(),
        tempo_determinado: form.tempo_determinado,
        ativo: form.ativo,
      };
      await criarTipoContrato(dto);
      setFeedback({ type: "success", message: `Tipo de Contrato "${form.descricao}" salvo com sucesso.` });
      const lista = await listarTiposContrato();
      setTipos(lista.length > 0 ? lista : MOCK_TIPOS);
      setShowResults(true);
    } catch (error) {
      setFeedback({ type: "error", message: normalizeError(error, "Erro ao salvar tipo de contrato.") });
    } finally {
      setIsSaving(false);
    }
  }

  function handleNovo() {
    setForm(FORM_INICIAL);
    setFeedback(null);
  }

  function handleLimpar() {
    handleNovo();
    setShowResults(false);
  }

  async function handleCarregar() {
    setFeedback(null);
    try {
      const lista = await listarTiposContrato();
      setTipos(lista.length > 0 ? lista : MOCK_TIPOS);
      setShowResults(true);
    } catch {
      setTipos(MOCK_TIPOS);
      setShowResults(true);
    }
  }

  return (
    <>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Inter:wght@300;400;500;600&display=swap');
        *, *::before, *::after { box-sizing: border-box; margin: 0; padding: 0; }

        .con-root {
          min-height: 100vh; background: #f0f4ee;
          font-family: 'Inter', sans-serif; color: #1a2e22;
          display: flex; flex-direction: column;
        }

        .con-topbar {
          height: 52px; background: #162e20;
          display: flex; align-items: center; justify-content: space-between;
          padding: 0 20px; flex-shrink: 0;
          border-bottom: 1px solid rgba(62,150,84,0.15);
        }
        .con-topbar-left { display: flex; align-items: center; gap: 10px; }
        .con-logo-mark {
          width: 28px; height: 28px; background: #3e9654;
          border-radius: 6px; display: flex; align-items: center; justify-content: center;
        }
        .con-app-name { font-size: 13px; font-weight: 600; color: #e0f0e3; line-height: 1.1; }
        .con-app-sub  { display: block; font-size: 9px; font-weight: 400; color: #3d6b4d; }
        .con-screen-title {
          font-size: 12.5px; font-weight: 500; color: #5a9a6a;
          padding-left: 14px; margin-left: 14px;
          border-left: 1px solid rgba(255,255,255,0.08);
        }

        .con-actionbar {
          background: #fff; border-bottom: 1px solid #dbe8d5;
          padding: 0 20px; display: flex; align-items: center;
          gap: 4px; height: 46px; flex-shrink: 0;
        }
        .con-action-group {
          display: flex; align-items: center; gap: 4px;
          padding-right: 12px; margin-right: 8px;
          border-right: 1px solid #e8f0e4;
        }
        .con-action-group:last-child { border-right: none; }
        .con-action-label {
          font-size: 9.5px; font-weight: 600; letter-spacing: 0.8px;
          text-transform: uppercase; color: #96b8a0; margin-right: 4px; white-space: nowrap;
        }
        .con-btn {
          display: inline-flex; align-items: center; gap: 6px;
          height: 32px; padding: 0 12px; border: 1.5px solid transparent;
          border-radius: 7px; font-family: 'Inter', sans-serif;
          font-size: 12.5px; font-weight: 500; cursor: pointer; white-space: nowrap;
          transition: background 0.13s, border-color 0.13s, color 0.13s;
        }
        .con-btn-primary { background: #162e20; color: #dff0e2; border-color: #162e20; }
        .con-btn-primary:hover:not(:disabled) { background: #1e3a2a; }
        .con-btn-primary:disabled { opacity: 0.5; cursor: not-allowed; }
        .con-btn-ghost { background: transparent; color: #4a7060; border-color: #d4e8d0; }
        .con-btn-ghost:hover:not(:disabled) { background: #f0f8ec; border-color: #b0d4b8; color: #1a3828; }
        .con-btn-ghost:disabled { opacity: 0.5; cursor: not-allowed; }
        .con-btn-danger { background: transparent; color: #b94040; border-color: #f0c8c8; }
        .con-btn-danger:hover:not(:disabled) { background: #fff0f0; border-color: #e09090; }
        .con-btn-new {
          background: #eef9f0; color: #1a6030; border-color: #b4d8b8; font-weight: 600;
        }
        .con-btn-new:hover:not(:disabled) { background: #dff5e4; border-color: #88c898; }

        .con-body {
          flex: 1; padding: 16px 20px; display: flex;
          flex-direction: column; gap: 0; overflow-y: auto;
        }
        .con-body::-webkit-scrollbar { width: 5px; }
        .con-body::-webkit-scrollbar-thumb { background: #cce0c8; border-radius: 4px; }

        .con-section-banner {
          display: flex; align-items: center; gap: 10px;
          padding: 14px 0 8px;
        }
        .con-section-banner:first-child { padding-top: 0; }
        .con-section-banner-pill {
          font-size: 9.5px; font-weight: 700; letter-spacing: 1.2px;
          text-transform: uppercase; color: #5a8068;
          background: #e0ede0; border: 1px solid #c8dcc8;
          border-radius: 20px; padding: 3px 10px; white-space: nowrap;
        }
        .con-section-banner-line { flex: 1; height: 1px; background: #dbe8d5; }
        .con-section-banner-hint { font-size: 11px; color: #96b8a0; white-space: nowrap; }

        .con-card {
          background: #fff; border: 1px solid #dbe8d5;
          border-radius: 12px; overflow: hidden; margin-bottom: 14px;
        }
        .con-card-header {
          display: flex; align-items: center; justify-content: space-between;
          padding: 12px 18px; border-bottom: 1px solid #edf5e8; background: #fafcf9;
        }
        .con-card-header-left { display: flex; align-items: center; gap: 8px; }
        .con-card-title { font-size: 12px; font-weight: 600; color: #2a4a35; text-transform: uppercase; letter-spacing: 0.6px; }
        .con-card-badge {
          font-size: 10.5px; font-weight: 500; color: #3e9654;
          background: #eef5ea; border: 1px solid #c4dfc8; border-radius: 12px; padding: 2px 8px;
        }
        .con-card-body { padding: 18px 18px; }

        .con-grid { display: grid; grid-template-columns: repeat(12, 1fr); gap: 16px 14px; align-items: start; }
        .con-col-4  { grid-column: span 4; }
        .con-col-5  { grid-column: span 5; }
        .con-col-8  { grid-column: span 8; }
        .con-col-12 { grid-column: span 12; }

        .con-field { display: flex; flex-direction: column; gap: 5px; }
        .con-label {
          font-size: 10.5px; font-weight: 600; color: #5a8068;
          text-transform: uppercase; letter-spacing: 0.4px;
          display: flex; align-items: center; gap: 4px;
        }
        .con-label-req { color: #c84040; font-size: 12px; line-height: 1; }
        .con-input {
          width: 100%; height: 36px; background: #f8fbf6;
          border: 1.5px solid #d4e8cc; border-radius: 7px;
          padding: 0 10px; font-family: 'Inter', sans-serif;
          font-size: 13px; color: #1a2e22; outline: none;
          transition: border-color 0.13s, box-shadow 0.13s;
        }
        .con-input:focus { border-color: #3e9654; box-shadow: 0 0 0 2px rgba(62,150,84,0.1); }
        .con-input::placeholder { color: #b0c8b8; font-size: 12px; }

        .con-select {
          width: 100%; height: 36px; background: #f8fbf6;
          border: 1.5px solid #d4e8cc; border-radius: 7px;
          padding: 0 28px 0 10px; font-family: 'Inter', sans-serif;
          font-size: 13px; color: #1a2e22; outline: none;
          appearance: none; cursor: pointer;
          background-image: url("data:image/svg+xml,%3Csvg width='10' height='6' viewBox='0 0 10 6' xmlns='http://www.w3.org/2000/svg'%3E%3Cpath d='M1 1l4 4 4-4' stroke='%23789a84' stroke-width='1.5' fill='none' stroke-linecap='round' stroke-linejoin='round'/%3E%3C/svg%3E");
          background-repeat: no-repeat; background-position: right 10px center;
          transition: border-color 0.13s;
        }
        .con-select:focus { border-color: #3e9654; box-shadow: 0 0 0 2px rgba(62,150,84,0.1); }

        .con-toggle-row { display: flex; align-items: center; gap: 10px; padding-top: 2px; }
        .con-toggle { position: relative; width: 38px; height: 20px; flex-shrink: 0; cursor: pointer; }
        .con-toggle input { opacity: 0; width: 0; height: 0; position: absolute; }
        .con-toggle-track { position: absolute; inset: 0; background: #d4e0d0; border-radius: 20px; transition: background 0.2s; }
        .con-toggle input:checked ~ .con-toggle-track { background: #3e9654; }
        .con-toggle-thumb {
          position: absolute; top: 3px; left: 3px; width: 14px; height: 14px;
          background: #fff; border-radius: 50%; transition: transform 0.2s;
          box-shadow: 0 1px 3px rgba(0,0,0,0.15);
        }
        .con-toggle input:checked ~ .con-toggle-thumb { transform: translateX(18px); }
        .con-toggle-label { font-size: 13px; color: #3a5a45; font-weight: 500; }

        .con-results-wrap { border-top: 1px solid #edf5e8; overflow-x: auto; }
        .con-results-bar {
          display: flex; align-items: center; justify-content: space-between;
          padding: 10px 18px; background: #f4f9f2; border-bottom: 1px solid #e8f0e4;
        }
        .con-results-bar-left { display: flex; align-items: center; gap: 8px; }
        .con-results-bar-label { font-size: 11px; font-weight: 600; color: #4a7060; text-transform: uppercase; letter-spacing: 0.5px; }
        .con-results-table { width: 100%; border-collapse: collapse; font-size: 13px; }
        .con-results-table th {
          background: #f4f9f2; padding: 8px 12px; text-align: left;
          font-size: 10.5px; font-weight: 700; color: #5a8068;
          text-transform: uppercase; letter-spacing: 0.5px;
          border-bottom: 1.5px solid #dbe8d5; white-space: nowrap;
        }
        .con-results-table td { padding: 9px 12px; border-bottom: 1px solid #f0f6ec; color: #243830; vertical-align: middle; }
        .con-results-empty { text-align: center; padding: 28px 12px; color: #96b8a0; font-size: 12.5px; }

        .con-feedback {
          display: flex; align-items: center; gap: 9px; padding: 11px 15px;
          border-radius: 9px; font-size: 13px; animation: conFadeIn 0.2s ease;
          margin-bottom: 14px;
        }
        .con-feedback.success { background: #f0faf2; border: 1px solid #b4dec0; color: #1e6030; }
        .con-feedback.error   { background: #fff5f5; border: 1px solid #f8c0c0; border-left: 3px solid #e05252; color: #b91c1c; }
        .con-feedback.info    { background: #f0f8ff; border: 1px solid #c7def8; border-left: 3px solid #4a90d9; color: #1a4070; }

        .con-footer {
          background: #fff; border-top: 1px solid #dbe8d5;
          padding: 8px 20px; display: flex; align-items: center;
          justify-content: space-between; flex-shrink: 0;
        }
        .con-footer-left { display: flex; align-items: center; gap: 20px; }
        .con-footer-stat { display: flex; align-items: center; gap: 6px; font-size: 11.5px; color: #6a8a74; }
        .con-footer-stat strong { color: #1a2e22; font-weight: 600; }

        @keyframes conSpin { to { transform: rotate(360deg); } }
        .con-spinner {
          width: 14px; height: 14px; flex-shrink: 0;
          border: 2px solid rgba(223,240,226,0.3); border-top-color: #dff0e2;
          border-radius: 50%; animation: conSpin 0.65s linear infinite;
        }
        .con-spinner-dark {
          width: 14px; height: 14px; flex-shrink: 0;
          border: 2px solid #d4e8cc; border-top-color: #3e9654;
          border-radius: 50%; animation: conSpin 0.65s linear infinite;
        }
        @keyframes conFadeIn { from { opacity: 0; transform: translateY(-4px); } to { opacity: 1; transform: translateY(0); } }
      `}</style>

      <div className="con-root">
        {/* ── TOPBAR ── */}
        <header className="con-topbar">
          <div className="con-topbar-left">
            <div className="con-logo-mark">
              <svg width="15" height="15" viewBox="0 0 18 18" fill="none">
                <rect x="1.5" y="1.5" width="6" height="6" rx="1.2" fill="rgba(255,255,255,0.9)" />
                <rect x="10.5" y="1.5" width="6" height="6" rx="1.2" fill="rgba(255,255,255,0.4)" />
                <rect x="1.5" y="10.5" width="6" height="6" rx="1.2" fill="rgba(255,255,255,0.4)" />
                <rect x="10.5" y="10.5" width="6" height="6" rx="1.2" fill="rgba(255,255,255,0.7)" />
              </svg>
            </div>
            <span className="con-app-name">
              Venture<span className="con-app-sub">ERP &amp; Soluções</span>
            </span>
            <span className="con-screen-title">VCON0100 — Cadastro do Tipo de Contratos</span>
          </div>
        </header>

        {/* ── ACTION BAR ── */}
        <div className="con-actionbar">
          <div className="con-action-group">
            <span className="con-action-label">Cadastro</span>
            <button className="con-btn con-btn-new" onClick={handleNovo} disabled={isSaving}>
              <svg width="12" height="12" viewBox="0 0 12 12" fill="none">
                <path d="M6 2v8M2 6h8" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" />
              </svg>
              Novo Tipo
            </button>
          </div>

          <div className="con-action-group">
            <span className="con-action-label">Ações</span>
            <button className="con-btn con-btn-primary" onClick={() => void handleSalvar()} disabled={isSaving}>
              {isSaving
                ? <><div className="con-spinner" />Salvando...</>
                : <>
                    <svg width="13" height="13" viewBox="0 0 16 16" fill="none">
                      <path d="M2 2h9l3 3v9a1 1 0 01-1 1H3a1 1 0 01-1-1V3a1 1 0 011-1z" stroke="currentColor" strokeWidth="1.4" strokeLinejoin="round" />
                      <path d="M5 2v4h6V2M5 9h6" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" />
                    </svg>
                    Salvar
                  </>
              }
            </button>
            <button className="con-btn con-btn-danger" onClick={handleLimpar} disabled={isSaving}>
              <svg width="13" height="13" viewBox="0 0 16 16" fill="none">
                <path d="M3 3l10 10M13 3L3 13" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
              </svg>
              Limpar
            </button>
          </div>

          <div className="con-action-group">
            <button className="con-btn con-btn-ghost">
              <svg width="13" height="13" viewBox="0 0 16 16" fill="none">
                <circle cx="8" cy="8" r="6" stroke="currentColor" strokeWidth="1.4" />
                <path d="M8 7v4M8 5.5h.01" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" />
              </svg>
              Ajuda
            </button>
          </div>
        </div>

        {/* ── BODY ── */}
        <div className="con-body">
          {feedback && (
            <div className={`con-feedback ${feedback.type}`}>
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

          {/* SEÇÃO 1 — FORMULÁRIO */}
          <div className="con-section-banner">
            <span className="con-section-banner-pill">1 — Cadastro</span>
            <div className="con-section-banner-line" />
            <span className="con-section-banner-hint">Preencha os campos e clique em Salvar</span>
          </div>

          <div className="con-card">
            <div className="con-card-header">
              <div className="con-card-header-left">
                <svg width="14" height="14" viewBox="0 0 16 16" fill="none">
                  <path d="M2 2h9l3 3v9a1 1 0 01-1 1H3a1 1 0 01-1-1V3a1 1 0 011-1z" stroke="#3e9654" strokeWidth="1.4" strokeLinejoin="round" />
                  <path d="M5 2v4h6V2M5 9h6" stroke="#3e9654" strokeWidth="1.4" strokeLinecap="round" />
                </svg>
                <span className="con-card-title">Tipo de Contrato</span>
              </div>
            </div>
            <div className="con-card-body">
              <div className="con-grid">
                <div className="con-field con-col-5">
                  <label className="con-label">Descrição <span className="con-label-req">*</span></label>
                  <input
                    className="con-input"
                    placeholder="Ex: Contrato de Compra"
                    value={form.descricao}
                    onChange={(e) => setField("descricao", e.target.value)}
                    maxLength={100}
                  />
                </div>

                <div className="con-field con-col-4">
                  <label className="con-label">Tempo Determinado <span className="con-label-req">*</span></label>
                  <select
                    className="con-select"
                    value={form.tempo_determinado}
                    onChange={(e) => setField("tempo_determinado", e.target.value)}
                  >
                    <option value="Sim">Sim</option>
                    <option value="Não">Não</option>
                  </select>
                </div>

                <div className="con-field con-col-3">
                  <label className="con-label">Ativo</label>
                  <div style={{ paddingTop: 6 }}>
                    <div className="con-toggle-row">
                      <label className="con-toggle">
                        <input
                          type="checkbox"
                          checked={form.ativo}
                          onChange={(e) => setField("ativo", e.target.checked)}
                        />
                        <div className="con-toggle-track" />
                        <div className="con-toggle-thumb" />
                      </label>
                      <span className="con-toggle-label">
                        {form.ativo ? "Sim" : "Não"}
                      </span>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* SEÇÃO 2 — RESULTADOS */}
          <div className="con-section-banner">
            <span className="con-section-banner-pill">2 — Lista</span>
            <div className="con-section-banner-line" />
            <span className="con-section-banner-hint">Clique em Carregar para listar os tipos de contrato</span>
          </div>

          <div className="con-card">
            <div className="con-card-header">
              <div className="con-card-header-left">
                <svg width="14" height="14" viewBox="0 0 16 16" fill="none">
                  <circle cx="6.5" cy="6.5" r="4.5" stroke="#3e9654" strokeWidth="1.4" />
                  <path d="M10 10l3.5 3.5" stroke="#3e9654" strokeWidth="1.4" strokeLinecap="round" />
                </svg>
                <span className="con-card-title">Tipos de Contrato</span>
              </div>
              <button className="con-btn con-btn-ghost" onClick={() => void handleCarregar()}>
                Carregar
              </button>
            </div>

            {showResults && (
              <div className="con-results-wrap">
                <div className="con-results-bar">
                  <div className="con-results-bar-left">
                    <svg width="13" height="13" viewBox="0 0 16 16" fill="none">
                      <path d="M2 4h12M2 8h12M2 12h8" stroke="#5a8068" strokeWidth="1.4" strokeLinecap="round" />
                    </svg>
                    <span className="con-results-bar-label">Resultados</span>
                    <span className="con-card-badge">{tipos.length} registro(s)</span>
                  </div>
                </div>

                {tipos.length === 0 ? (
                  <div className="con-results-empty">Nenhum tipo de contrato cadastrado.</div>
                ) : (
                  <table className="con-results-table">
                    <thead>
                      <tr>
                        <th style={{ width: 90 }}>Código</th>
                        <th>Descrição</th>
                        <th style={{ width: 130 }}>Tempo Det.</th>
                        <th style={{ width: 80 }}>Ativo</th>
                      </tr>
                    </thead>
                    <tbody>
                      {tipos.map((t) => (
                        <tr key={t.codigo}>
                          <td style={{ fontWeight: 600, color: "#1a4a2a" }}>{t.codigo}</td>
                          <td>{t.descricao}</td>
                          <td>{t.tempo_determinado}</td>
                          <td>
                            <span style={{ color: t.ativo ? "#2a8040" : "#b0c8b8", fontWeight: 600, fontSize: 12 }}>
                              {t.ativo ? "Sim" : "Não"}
                            </span>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                )}
              </div>
            )}
          </div>
        </div>

        {/* ── FOOTER ── */}
        <footer className="con-footer">
          <div className="con-footer-left">
            <div className="con-footer-stat">Tipos: <strong>{tipos.length}</strong></div>
            <div className="con-footer-stat">Módulo: <strong>Suprimento</strong></div>
          </div>
          <div className="con-footer-stat" style={{ gap: 8 }}>
            <span style={{ color: "#b0c8b8", fontSize: 11 }}>GRUPO VENTURE LTDA</span>
          </div>
        </footer>
      </div>
    </>
  );
}
