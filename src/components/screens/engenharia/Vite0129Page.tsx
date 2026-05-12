import { useState } from "react";
import axios from "axios";
import {
  replicarParametros,
  MOCK_ITENS,
  MOCK_CONFIGURADOS,
  MOCK_CLASSIFICACAO,
  MOCK_PASTAS,
} from "@/services/itensConfigService";

// ─── Types ────────────────────────────────────────────────────────────────────

type FeedbackState = { type: "success" | "error" | "info"; message: string } | null;

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

export function Vite0129Page(): JSX.Element {
  const [itens, setItens] = useState("");
  const [configurado, setConfigurado] = useState("");
  const [classificacao, setClassificacao] = useState("");
  const [pastas, setPastas] = useState<string[]>([]);

  const [isUpdating, setIsUpdating] = useState(false);
  const [feedback, setFeedback] = useState<FeedbackState>(null);

  function togglePasta(value: string) {
    setPastas(p => p.includes(value) ? p.filter(v => v !== value) : [...p, value]);
    setFeedback(null);
  }

  function selectAllPastas() {
    setPastas(MOCK_PASTAS.map(p => p.value));
  }

  function deselectAllPastas() {
    setPastas([]);
  }

  function handleConfigurarClick() {
    if (!itens) {
      setFeedback({ type: "info", message: "Selecione um item antes de configurar." });
      return;
    }
    // Simula ação de configurar
    setFeedback({ type: "info", message: `Configuração do item ${itens} será aberta.` });
  }

  async function handleAtualizarPastas() {
    if (!itens) {
      setFeedback({ type: "info", message: "Selecione um item." });
      return;
    }
    if (pastas.length === 0) {
      setFeedback({ type: "info", message: "Selecione pelo menos uma pasta para atualizar." });
      return;
    }

    setIsUpdating(true);
    setFeedback(null);
    try {
      const result = await replicarParametros({
        itens,
        configurado,
        classificacao,
        pastas,
      });
      setFeedback({ type: "success", message: result.message ?? "Parâmetros replicados com sucesso." });
    } catch (error) {
      setFeedback({ type: "error", message: normalizeError(error, "Erro ao replicar parâmetros.") });
    } finally {
      setIsUpdating(false);
    }
  }

  function handleLimpar() {
    setItens("");
    setConfigurado("");
    setClassificacao("");
    setPastas([]);
    setFeedback(null);
  }

  return (
    <>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Inter:wght@300;400;500;600&display=swap');
        *, *::before, *::after { box-sizing: border-box; margin: 0; padding: 0; }

        .rep-root {
          min-height: 100vh; background: #f0f4ee;
          font-family: 'Inter', sans-serif; color: #1a2e22;
          display: flex; flex-direction: column;
        }
        .rep-topbar {
          height: 52px; background: #162e20;
          display: flex; align-items: center; justify-content: space-between;
          padding: 0 20px; flex-shrink: 0;
          border-bottom: 1px solid rgba(62,150,84,0.15);
        }
        .rep-topbar-left { display: flex; align-items: center; gap: 10px; }
        .rep-logo-mark {
          width: 28px; height: 28px; background: #3e9654;
          border-radius: 6px; display: flex; align-items: center; justify-content: center;
        }
        .rep-app-name { font-size: 13px; font-weight: 600; color: #e0f0e3; line-height: 1.1; }
        .rep-app-sub  { display: block; font-size: 9px; font-weight: 400; color: #3d6b4d; }
        .rep-screen-title {
          font-size: 12.5px; font-weight: 500; color: #5a9a6a;
          padding-left: 14px; margin-left: 14px;
          border-left: 1px solid rgba(255,255,255,0.08);
        }
        .rep-actionbar {
          background: #fff; border-bottom: 1px solid #dbe8d5;
          padding: 0 20px; display: flex; align-items: center;
          gap: 4px; height: 46px; flex-shrink: 0;
        }
        .rep-action-group {
          display: flex; align-items: center; gap: 4px;
          padding-right: 12px; margin-right: 8px;
          border-right: 1px solid #e8f0e4;
        }
        .rep-action-group:last-child { border-right: none; }
        .rep-action-label {
          font-size: 9.5px; font-weight: 600; letter-spacing: 0.8px;
          text-transform: uppercase; color: #96b8a0; margin-right: 4px; white-space: nowrap;
        }
        .rep-btn {
          display: inline-flex; align-items: center; gap: 6px;
          height: 32px; padding: 0 12px; border: 1.5px solid transparent;
          border-radius: 7px; font-family: 'Inter', sans-serif;
          font-size: 12.5px; font-weight: 500; cursor: pointer; white-space: nowrap;
          transition: background 0.13s, border-color 0.13s, color 0.13s;
        }
        .rep-btn-primary { background: #162e20; color: #dff0e2; border-color: #162e20; }
        .rep-btn-primary:hover:not(:disabled) { background: #1e3a2a; }
        .rep-btn-primary:disabled { opacity: 0.5; cursor: not-allowed; }
        .rep-btn-ghost { background: transparent; color: #4a7060; border-color: #d4e8d0; }
        .rep-btn-ghost:hover:not(:disabled) { background: #f0f8ec; border-color: #b0d4b8; color: #1a3828; }
        .rep-btn-ghost:disabled { opacity: 0.5; cursor: not-allowed; }
        .rep-btn-danger { background: transparent; color: #b94040; border-color: #f0c8c8; }
        .rep-btn-danger:hover:not(:disabled) { background: #fff0f0; border-color: #e09090; }
        .rep-btn-sm { height: 28px; padding: 0 9px; font-size: 12px; }
        .rep-btn-config {
          background: #eef5ea; color: #3a6048; border-color: #b4d8b8; font-weight: 600;
          height: 36px; padding: 0 14px;
        }
        .rep-btn-config:hover:not(:disabled) { background: #ddf0e0; }

        .rep-body {
          flex: 1; padding: 16px 20px; display: flex;
          flex-direction: column; gap: 0; overflow-y: auto;
        }
        .rep-body::-webkit-scrollbar { width: 5px; }
        .rep-body::-webkit-scrollbar-thumb { background: #cce0c8; border-radius: 4px; }

        .rep-section-banner {
          display: flex; align-items: center; gap: 10px; padding: 14px 0 8px;
        }
        .rep-section-banner:first-child { padding-top: 0; }
        .rep-section-pill {
          font-size: 9.5px; font-weight: 700; letter-spacing: 1.2px;
          text-transform: uppercase; color: #5a8068;
          background: #e0ede0; border: 1px solid #c8dcc8;
          border-radius: 20px; padding: 3px 10px; white-space: nowrap;
        }
        .rep-section-line { flex: 1; height: 1px; background: #dbe8d5; }
        .rep-section-hint { font-size: 11px; color: #96b8a0; white-space: nowrap; }

        .rep-card {
          background: #fff; border: 1px solid #dbe8d5;
          border-radius: 12px; overflow: hidden; margin-bottom: 14px;
        }
        .rep-card-header {
          display: flex; align-items: center; justify-content: space-between;
          padding: 12px 18px; border-bottom: 1px solid #edf5e8; background: #fafcf9;
        }
        .rep-card-header-left { display: flex; align-items: center; gap: 8px; }
        .rep-card-title { font-size: 12px; font-weight: 600; color: #2a4a35; text-transform: uppercase; letter-spacing: 0.6px; }
        .rep-card-badge {
          font-size: 10.5px; font-weight: 500; color: #3e9654;
          background: #eef5ea; border: 1px solid #c4dfc8; border-radius: 12px; padding: 2px 8px;
        }
        .rep-card-body { padding: 18px 18px; }

        .rep-grid { display: grid; grid-template-columns: repeat(12, 1fr); gap: 16px 14px; align-items: start; }
        .rep-col-3  { grid-column: span 3; }
        .rep-col-4  { grid-column: span 4; }
        .rep-col-5  { grid-column: span 5; }
        .rep-col-6  { grid-column: span 6; }
        .rep-col-12 { grid-column: span 12; }

        .rep-field { display: flex; flex-direction: column; gap: 5px; }
        .rep-label {
          font-size: 10.5px; font-weight: 600; color: #5a8068;
          text-transform: uppercase; letter-spacing: 0.4px;
        }
        .rep-select {
          width: 100%; height: 36px; background: #f8fbf6;
          border: 1.5px solid #d4e8cc; border-radius: 7px;
          padding: 0 28px 0 10px; font-family: 'Inter', sans-serif;
          font-size: 13px; color: #1a2e22; outline: none;
          appearance: none; cursor: pointer;
          background-image: url("data:image/svg+xml,%3Csvg width='10' height='6' viewBox='0 0 10 6' xmlns='http://www.w3.org/2000/svg'%3E%3Cpath d='M1 1l4 4 4-4' stroke='%23789a84' stroke-width='1.5' fill='none' stroke-linecap='round' stroke-linejoin='round'/%3E%3C/svg%3E");
          background-repeat: no-repeat; background-position: right 10px center;
          transition: border-color 0.13s;
        }
        .rep-select:focus { border-color: #3e9654; box-shadow: 0 0 0 2px rgba(62,150,84,0.1); }
        .rep-field-hint { font-size: 11px; color: #7a9c84; margin-top: 2px; }

        .rep-section-sep { height: 1px; background: #edf5e8; margin: 14px 0; }

        .rep-pastas-grid { display: grid; grid-template-columns: repeat(4, 1fr); gap: 10px; }
        .rep-pasta-check {
          display: flex; align-items: center; gap: 8px;
          padding: 10px 12px; border: 1.5px solid #d4e8cc; border-radius: 8px;
          background: #f8fbf6; cursor: pointer; transition: all 0.13s;
        }
        .rep-pasta-check:hover { border-color: #b4d8b8; background: #f0f8ec; }
        .rep-pasta-check input[type="checkbox"] { accent-color: #3e9654; width: 15px; height: 15px; cursor: pointer; }
        .rep-pasta-label { font-size: 12.5px; font-weight: 500; color: #3a5a45; }
        .rep-pasta-check.checked { background: #eef9f0; border-color: #3e9654; }

        .rep-feedback {
          display: flex; align-items: center; gap: 9px; padding: 11px 15px;
          border-radius: 9px; font-size: 13px; animation: repFadeIn 0.2s ease;
          margin-bottom: 14px;
        }
        .rep-feedback.success { background: #f0faf2; border: 1px solid #b4dec0; color: #1e6030; }
        .rep-feedback.error   { background: #fff5f5; border: 1px solid #f8c0c0; border-left: 3px solid #e05252; color: #b91c1c; }
        .rep-feedback.info    { background: #f0f8ff; border: 1px solid #c7def8; border-left: 3px solid #4a90d9; color: #1a4070; }

        @keyframes spin { to { transform: rotate(360deg); } }
        .rep-spinner {
          width: 14px; height: 14px; flex-shrink: 0;
          border: 2px solid rgba(223,240,226,0.3); border-top-color: #dff0e2;
          border-radius: 50%; animation: spin 0.65s linear infinite;
        }
        @keyframes repFadeIn { from { opacity: 0; transform: translateY(-4px); } to { opacity: 1; transform: translateY(0); } }
      `}</style>

      <div className="rep-root">

        <header className="rep-topbar">
          <div className="rep-topbar-left">
            <div className="rep-logo-mark">
              <svg width="15" height="15" viewBox="0 0 18 18" fill="none">
                <rect x="1.5" y="1.5" width="6" height="6" rx="1.2" fill="rgba(255,255,255,0.9)" />
                <rect x="10.5" y="1.5" width="6" height="6" rx="1.2" fill="rgba(255,255,255,0.4)" />
                <rect x="1.5" y="10.5" width="6" height="6" rx="1.2" fill="rgba(255,255,255,0.4)" />
                <rect x="10.5" y="10.5" width="6" height="6" rx="1.2" fill="rgba(255,255,255,0.7)" />
              </svg>
            </div>
            <span className="rep-app-name">
              Venture<span className="rep-app-sub">ERP &amp; Soluções</span>
            </span>
            <span className="rep-screen-title">VITE0129 — Replicação de Parâmetros de Itens Configurados</span>
          </div>
        </header>

        <div className="rep-actionbar">
          <div className="rep-action-group">
            <span className="rep-action-label">Ações</span>
            <button className="rep-btn rep-btn-primary" onClick={() => void handleAtualizarPastas()} disabled={isUpdating}>
              {isUpdating ? <><div className="rep-spinner" />Atualizando...</> : <><svg width="13" height="13" viewBox="0 0 16 16" fill="none"><path d="M2 2h9l3 3v9a1 1 0 01-1 1H3a1 1 0 01-1-1V3a1 1 0 011-1z" stroke="currentColor" strokeWidth="1.4" strokeLinejoin="round" /><path d="M5 2v4h6V2M5 9h6" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" /></svg>Atualizar Pastas</>}
            </button>
            <button className="rep-btn rep-btn-danger" onClick={handleLimpar} disabled={isUpdating}>
              <svg width="13" height="13" viewBox="0 0 16 16" fill="none"><path d="M3 3l10 10M13 3L3 13" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" /></svg>
              Limpar
            </button>
          </div>
          <div className="rep-action-group">
            <button className="rep-btn rep-btn-ghost">
              <svg width="13" height="13" viewBox="0 0 16 16" fill="none"><circle cx="8" cy="8" r="6" stroke="currentColor" strokeWidth="1.4" /><path d="M8 7v4M8 5.5h.01" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" /></svg>
              Ajuda
            </button>
          </div>
        </div>

        <div className="rep-body">

          {feedback && (
            <div className={`rep-feedback ${feedback.type}`}>
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
          {/* SEÇÃO 1 — SELEÇÃO                                          */}
          {/* ═══════════════════════════════════════════════════════════ */}

          <div className="rep-section-banner">
            <span className="rep-section-pill">1 — Seleção</span>
            <div className="rep-section-line" />
            <span className="rep-section-hint">Selecione o item e opções de configuração</span>
          </div>

          <div className="rep-card">
            <div className="rep-card-header">
              <div className="rep-card-header-left">
                <svg width="14" height="14" viewBox="0 0 16 16" fill="none"><circle cx="6.5" cy="6.5" r="4.5" stroke="#3e9654" strokeWidth="1.4" /><path d="M10 10l3.5 3.5" stroke="#3e9654" strokeWidth="1.4" strokeLinecap="round" /></svg>
                <span className="rep-card-title">Seleção</span>
              </div>
            </div>

            <div className="rep-card-body">
              <div className="rep-grid">
                <div className="rep-field rep-col-3">
                  <label className="rep-label">Itens</label>
                  <select className="rep-select" value={itens} onChange={e => { setItens(e.target.value); setFeedback(null); }}>
                    <option value="">Selecione...</option>
                    {MOCK_ITENS.map(i => <option key={i.value} value={i.value}>{i.label}</option>)}
                  </select>
                </div>
                <div className="rep-field rep-col-3">
                  <label className="rep-label">Configurado</label>
                  <select className="rep-select" value={configurado} onChange={e => { setConfigurado(e.target.value); setFeedback(null); }}>
                    <option value="">Selecione...</option>
                    {MOCK_CONFIGURADOS.map(c => <option key={c.value} value={c.value}>{c.label}</option>)}
                  </select>
                </div>
                <div className="rep-field" style={{ alignSelf: "flex-end" }}>
                  <button className="rep-btn rep-btn-config" onClick={handleConfigurarClick}>
                    <svg width="12" height="12" viewBox="0 0 12 12" fill="none"><circle cx="6" cy="6" r="5" stroke="currentColor" strokeWidth="1.2" /><path d="M4 6h4M6 4v4" stroke="currentColor" strokeWidth="1.2" strokeLinecap="round" /></svg>
                    Config.
                  </button>
                </div>
                <div className="rep-field rep-col-3">
                  <label className="rep-label">Classificação</label>
                  <select className="rep-select" value={classificacao} onChange={e => { setClassificacao(e.target.value); setFeedback(null); }}>
                    <option value="">Selecione...</option>
                    {MOCK_CLASSIFICACAO.map(c => <option key={c.value} value={c.value}>{c.label}</option>)}
                  </select>
                </div>
              </div>
            </div>
          </div>

          {/* ═══════════════════════════════════════════════════════════ */}
          {/* SEÇÃO 2 — PASTAS PARA ATUALIZAR                            */}
          {/* ═══════════════════════════════════════════════════════════ */}

          <div className="rep-section-banner">
            <span className="rep-section-pill">2 — Pastas para Atualizar</span>
            <div className="rep-section-line" />
            <span className="rep-section-hint">{pastas.length} de {MOCK_PASTAS.length} pastas selecionadas</span>
          </div>

          <div className="rep-card">
            <div className="rep-card-header">
              <div className="rep-card-header-left">
                <svg width="14" height="14" viewBox="0 0 16 16" fill="none"><path d="M2 4h6l2 2h4a1 1 0 011 1v5a1 1 0 01-1 1H3a1 1 0 01-1-1V5a1 1 0 011-1z" stroke="#3e9654" strokeWidth="1.4" strokeLinejoin="round" /></svg>
                <span className="rep-card-title">Pastas</span>
              </div>
              <div style={{ display: "flex", gap: 6 }}>
                <button className="rep-btn rep-btn-ghost rep-btn-sm" onClick={selectAllPastas}>Marcar Todos</button>
                <button className="rep-btn rep-btn-ghost rep-btn-sm" onClick={deselectAllPastas}>Desmarcar Todos</button>
              </div>
            </div>

            <div className="rep-card-body">
              <div className="rep-pastas-grid">
                {MOCK_PASTAS.map(pasta => (
                  <label
                    key={pasta.value}
                    className={`rep-pasta-check${pastas.includes(pasta.value) ? " checked" : ""}`}
                  >
                    <input
                      type="checkbox"
                      checked={pastas.includes(pasta.value)}
                      onChange={() => togglePasta(pasta.value)}
                    />
                    <span className="rep-pasta-label">{pasta.label}</span>
                  </label>
                ))}
              </div>
              <div className="rep-section-sep" />
              <span className="rep-field-hint">
                {pastas.length === 0
                  ? "Nenhuma pasta selecionada. Selecione ao menos uma para a replicação."
                  : `${pastas.length} pasta(s) selecionada(s) para replicação de parâmetros.`}
              </span>
            </div>
          </div>
        </div>
      </div>
    </>
  );
}
