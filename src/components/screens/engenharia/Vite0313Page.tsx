import { useState } from "react";
import {
  gerarMascaras,
  MOCK_ITENS_CONFIGURADOS,
  MOCK_CARACTERISTICAS_POR_ITEM,
  type MascaraResponse,
} from "@/services/mascaraService";
import axios from "axios";

// ─── Types ────────────────────────────────────────────────────────────────────

interface LinhaSelecao {
  seq: number;
  caracteristica: string;
  variavel: string;
}

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

export function Vite0313Page(): JSX.Element {
  const [item, setItem] = useState("");
  const [linhas, setLinhas] = useState<LinhaSelecao[]>([]);
  const [resultados, setResultados] = useState<MascaraResponse[]>([]);
  const [mostrarResultados, setMostrarResultados] = useState(false);

  const [isGerating, setIsGerating] = useState(false);
  const [feedback, setFeedback] = useState<FeedbackState>(null);

  function handleItemChange(value: string) {
    setItem(value);
    setFeedback(null);
    setMostrarResultados(false);

    if (!value) {
      setLinhas([]);
      return;
    }

    const chars = MOCK_CARACTERISTICAS_POR_ITEM[value];
    if (chars) {
      setLinhas(chars.map((c, i) => ({
        seq: (i + 1) * 10,
        caracteristica: c.caracteristica,
        variavel: "",
      })));
    } else {
      setLinhas([]);
    }
  }

  function setVariavel(seq: number, variavel: string) {
    setLinhas(p => p.map(l => l.seq === seq ? { ...l, variavel } : l));
    setFeedback(null);
    setMostrarResultados(false);
  }

  async function handleGerar() {
    if (!item) {
      setFeedback({ type: "info", message: "Selecione um item antes de gerar." });
      return;
    }
    const selecionadas = linhas.filter(l => l.variavel);
    if (selecionadas.length === 0) {
      setFeedback({ type: "info", message: "Selecione pelo menos uma variável." });
      return;
    }

    setIsGerating(true);
    setFeedback(null);
    try {
      const results = await gerarMascaras({
        item,
        caracteristicas: selecionadas.map(l => ({ seq: l.seq, caracteristica: l.caracteristica, variavel: l.variavel })),
      });
      setResultados(results);
      setMostrarResultados(true);
      if (results.length === 0) {
        setFeedback({ type: "info", message: "Nenhuma máscara gerada." });
      } else {
        setFeedback({ type: "success", message: `${results.length} máscara(s) gerada(s) com sucesso.` });
      }
    } catch (error) {
      setFeedback({ type: "error", message: normalizeError(error, "Erro ao gerar máscaras.") });
    } finally {
      setIsGerating(false);
    }
  }

  function handleLimpar() {
    setItem("");
    setLinhas([]);
    setResultados([]);
    setMostrarResultados(false);
    setFeedback(null);
  }

  return (
    <>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Inter:wght@300;400;500;600&display=swap');
        *, *::before, *::after { box-sizing: border-box; margin: 0; padding: 0; }

        .mas-root {
          min-height: 100vh; background: #f0f4ee;
          font-family: 'Inter', sans-serif; color: #1a2e22;
          display: flex; flex-direction: column;
        }
        .mas-topbar {
          height: 52px; background: #162e20;
          display: flex; align-items: center; justify-content: space-between;
          padding: 0 20px; flex-shrink: 0;
          border-bottom: 1px solid rgba(62,150,84,0.15);
        }
        .mas-topbar-left { display: flex; align-items: center; gap: 10px; }
        .mas-logo-mark {
          width: 28px; height: 28px; background: #3e9654;
          border-radius: 6px; display: flex; align-items: center; justify-content: center;
        }
        .mas-app-name { font-size: 13px; font-weight: 600; color: #e0f0e3; line-height: 1.1; }
        .mas-app-sub  { display: block; font-size: 9px; font-weight: 400; color: #3d6b4d; }
        .mas-screen-title {
          font-size: 12.5px; font-weight: 500; color: #5a9a6a;
          padding-left: 14px; margin-left: 14px;
          border-left: 1px solid rgba(255,255,255,0.08);
        }
        .mas-actionbar {
          background: #fff; border-bottom: 1px solid #dbe8d5;
          padding: 0 20px; display: flex; align-items: center;
          gap: 4px; height: 46px; flex-shrink: 0;
        }
        .mas-action-group {
          display: flex; align-items: center; gap: 4px;
          padding-right: 12px; margin-right: 8px;
          border-right: 1px solid #e8f0e4;
        }
        .mas-action-group:last-child { border-right: none; }
        .mas-action-label {
          font-size: 9.5px; font-weight: 600; letter-spacing: 0.8px;
          text-transform: uppercase; color: #96b8a0; margin-right: 4px; white-space: nowrap;
        }
        .mas-btn {
          display: inline-flex; align-items: center; gap: 6px;
          height: 32px; padding: 0 12px; border: 1.5px solid transparent;
          border-radius: 7px; font-family: 'Inter', sans-serif;
          font-size: 12.5px; font-weight: 500; cursor: pointer; white-space: nowrap;
          transition: background 0.13s, border-color 0.13s, color 0.13s;
        }
        .mas-btn-primary { background: #162e20; color: #dff0e2; border-color: #162e20; }
        .mas-btn-primary:hover:not(:disabled) { background: #1e3a2a; }
        .mas-btn-primary:disabled { opacity: 0.5; cursor: not-allowed; }
        .mas-btn-ghost { background: transparent; color: #4a7060; border-color: #d4e8d0; }
        .mas-btn-ghost:hover:not(:disabled) { background: #f0f8ec; border-color: #b0d4b8; color: #1a3828; }
        .mas-btn-ghost:disabled { opacity: 0.5; cursor: not-allowed; }
        .mas-btn-danger { background: transparent; color: #b94040; border-color: #f0c8c8; }
        .mas-btn-danger:hover:not(:disabled) { background: #fff0f0; border-color: #e09090; }
        .mas-btn-sm { height: 28px; padding: 0 9px; font-size: 12px; }

        .mas-body {
          flex: 1; padding: 16px 20px; display: flex;
          flex-direction: column; gap: 0; overflow-y: auto;
        }
        .mas-body::-webkit-scrollbar { width: 5px; }
        .mas-body::-webkit-scrollbar-thumb { background: #cce0c8; border-radius: 4px; }

        .mas-section-banner {
          display: flex; align-items: center; gap: 10px; padding: 14px 0 8px;
        }
        .mas-section-banner:first-child { padding-top: 0; }
        .mas-section-pill {
          font-size: 9.5px; font-weight: 700; letter-spacing: 1.2px;
          text-transform: uppercase; color: #5a8068;
          background: #e0ede0; border: 1px solid #c8dcc8;
          border-radius: 20px; padding: 3px 10px; white-space: nowrap;
        }
        .mas-section-line { flex: 1; height: 1px; background: #dbe8d5; }
        .mas-section-hint { font-size: 11px; color: #96b8a0; white-space: nowrap; }

        .mas-card {
          background: #fff; border: 1px solid #dbe8d5;
          border-radius: 12px; overflow: hidden; margin-bottom: 14px;
        }
        .mas-card-header {
          display: flex; align-items: center; justify-content: space-between;
          padding: 12px 18px; border-bottom: 1px solid #edf5e8; background: #fafcf9;
        }
        .mas-card-header-left { display: flex; align-items: center; gap: 8px; }
        .mas-card-title { font-size: 12px; font-weight: 600; color: #2a4a35; text-transform: uppercase; letter-spacing: 0.6px; }
        .mas-card-badge {
          font-size: 10.5px; font-weight: 500; color: #3e9654;
          background: #eef5ea; border: 1px solid #c4dfc8; border-radius: 12px; padding: 2px 8px;
        }
        .mas-card-body { padding: 18px 18px; }

        .mas-field { display: flex; flex-direction: column; gap: 5px; }
        .mas-label {
          font-size: 10.5px; font-weight: 600; color: #5a8068;
          text-transform: uppercase; letter-spacing: 0.4px;
        }
        .mas-select {
          width: 100%; height: 36px; background: #f8fbf6;
          border: 1.5px solid #d4e8cc; border-radius: 7px;
          padding: 0 28px 0 10px; font-family: 'Inter', sans-serif;
          font-size: 13px; color: #1a2e22; outline: none;
          appearance: none; cursor: pointer;
          background-image: url("data:image/svg+xml,%3Csvg width='10' height='6' viewBox='0 0 10 6' xmlns='http://www.w3.org/2000/svg'%3E%3Cpath d='M1 1l4 4 4-4' stroke='%23789a84' stroke-width='1.5' fill='none' stroke-linecap='round' stroke-linejoin='round'/%3E%3C/svg%3E");
          background-repeat: no-repeat; background-position: right 10px center;
          transition: border-color 0.13s;
        }
        .mas-select:focus { border-color: #3e9654; box-shadow: 0 0 0 2px rgba(62,150,84,0.1); }
        .mas-field-hint { font-size: 11px; color: #7a9c84; margin-top: 2px; }

        .mas-table { width: 100%; border-collapse: collapse; font-size: 13px; margin-top: 12px; }
        .mas-table th {
          background: #f4f9f2; padding: 8px 12px; text-align: left;
          font-size: 10.5px; font-weight: 700; color: #5a8068;
          text-transform: uppercase; letter-spacing: 0.5px;
          border-bottom: 1.5px solid #dbe8d5; white-space: nowrap;
        }
        .mas-table td { padding: 9px 12px; border-bottom: 1px solid #f0f6ec; color: #243830; vertical-align: middle; }
        .mas-table tbody tr:hover { background: #f4fbf2; }

        .mas-results-wrap { border-top: 1px solid #edf5e8; overflow-x: auto; }
        .mas-results-bar {
          display: flex; align-items: center; justify-content: space-between;
          padding: 10px 18px; background: #f4f9f2; border-bottom: 1px solid #e8f0e4;
        }
        .mas-results-bar-left { display: flex; align-items: center; gap: 8px; }
        .mas-results-bar-label { font-size: 11px; font-weight: 600; color: #4a7060; text-transform: uppercase; letter-spacing: 0.5px; }
        .mas-results-hint { font-size: 11px; color: #96b8a0; }
        .mas-results-table { width: 100%; border-collapse: collapse; font-size: 13px; }
        .mas-results-table th {
          background: #f4f9f2; padding: 8px 12px; text-align: left;
          font-size: 10.5px; font-weight: 700; color: #5a8068;
          text-transform: uppercase; letter-spacing: 0.5px;
          border-bottom: 1.5px solid #dbe8d5; white-space: nowrap;
        }
        .mas-results-table td { padding: 9px 12px; border-bottom: 1px solid #f0f6ec; color: #243830; vertical-align: middle; }
        .mas-results-empty { text-align: center; padding: 28px 12px; color: #96b8a0; font-size: 12.5px; }

        .mas-feedback {
          display: flex; align-items: center; gap: 9px; padding: 11px 15px;
          border-radius: 9px; font-size: 13px; animation: masFadeIn 0.2s ease;
          margin-bottom: 14px;
        }
        .mas-feedback.success { background: #f0faf2; border: 1px solid #b4dec0; color: #1e6030; }
        .mas-feedback.error   { background: #fff5f5; border: 1px solid #f8c0c0; border-left: 3px solid #e05252; color: #b91c1c; }
        .mas-feedback.info    { background: #f0f8ff; border: 1px solid #c7def8; border-left: 3px solid #4a90d9; color: #1a4070; }

        @keyframes spin { to { transform: rotate(360deg); } }
        .mas-spinner {
          width: 14px; height: 14px; flex-shrink: 0;
          border: 2px solid rgba(223,240,226,0.3); border-top-color: #dff0e2;
          border-radius: 50%; animation: spin 0.65s linear infinite;
        }
        @keyframes masFadeIn { from { opacity: 0; transform: translateY(-4px); } to { opacity: 1; transform: translateY(0); } }
      `}</style>

      <div className="mas-root">

        <header className="mas-topbar">
          <div className="mas-topbar-left">
            <div className="mas-logo-mark">
              <svg width="15" height="15" viewBox="0 0 18 18" fill="none">
                <rect x="1.5" y="1.5" width="6" height="6" rx="1.2" fill="rgba(255,255,255,0.9)" />
                <rect x="10.5" y="1.5" width="6" height="6" rx="1.2" fill="rgba(255,255,255,0.4)" />
                <rect x="1.5" y="10.5" width="6" height="6" rx="1.2" fill="rgba(255,255,255,0.4)" />
                <rect x="10.5" y="10.5" width="6" height="6" rx="1.2" fill="rgba(255,255,255,0.7)" />
              </svg>
            </div>
            <span className="mas-app-name">
              Venture<span className="mas-app-sub">ERP &amp; Soluções</span>
            </span>
            <span className="mas-screen-title">VITE0313 — Geração de Máscara para Itens Configurados</span>
          </div>
        </header>

        <div className="mas-actionbar">
          <div className="mas-action-group">
            <span className="mas-action-label">Ações</span>
            <button className="mas-btn mas-btn-primary" onClick={() => void handleGerar()} disabled={isGerating}>
              {isGerating ? <><div className="mas-spinner" />Gerando...</> : <><svg width="13" height="13" viewBox="0 0 16 16" fill="none"><path d="M2 2h9l3 3v9a1 1 0 01-1 1H3a1 1 0 01-1-1V3a1 1 0 011-1z" stroke="currentColor" strokeWidth="1.4" strokeLinejoin="round" /><path d="M5 2v4h6V2M5 9h6" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" /></svg>Gerar Máscaras</>}
            </button>
            <button className="mas-btn mas-btn-danger" onClick={handleLimpar} disabled={isGerating}>
              <svg width="13" height="13" viewBox="0 0 16 16" fill="none"><path d="M3 3l10 10M13 3L3 13" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" /></svg>
              Limpar
            </button>
          </div>
          <div className="mas-action-group">
            <button className="mas-btn mas-btn-ghost">
              <svg width="13" height="13" viewBox="0 0 16 16" fill="none"><circle cx="8" cy="8" r="6" stroke="currentColor" strokeWidth="1.4" /><path d="M8 7v4M8 5.5h.01" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" /></svg>
              Ajuda
            </button>
          </div>
        </div>

        <div className="mas-body">

          {feedback && (
            <div className={`mas-feedback ${feedback.type}`}>
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

          <div className="mas-section-banner">
            <span className="mas-section-pill">1 — Seleção</span>
            <div className="mas-section-line" />
            <span className="mas-section-hint">Selecione o item e as variáveis desejadas</span>
          </div>

          <div className="mas-card">
            <div className="mas-card-header">
              <div className="mas-card-header-left">
                <svg width="14" height="14" viewBox="0 0 16 16" fill="none">
                  <path d="M2 4h12M2 8h12M2 12h8" stroke="#3e9654" strokeWidth="1.4" strokeLinecap="round" />
                </svg>
                <span className="mas-card-title">Item Configurado</span>
              </div>
            </div>

            <div className="mas-card-body">
              <div style={{ maxWidth: 400 }}>
                <div className="mas-field">
                  <label className="mas-label">Item</label>
                  <select className="mas-select" value={item} onChange={e => handleItemChange(e.target.value)}>
                    <option value="">Selecione um item configurado...</option>
                    {MOCK_ITENS_CONFIGURADOS.map(i => <option key={i.value} value={i.value}>{i.label}</option>)}
                  </select>
                  <span className="mas-field-hint">Apenas itens configurados com características do tipo "Escolha".</span>
                </div>
              </div>

              {linhas.length > 0 && (
                <table className="mas-table">
                  <thead>
                    <tr>
                      <th style={{ width: 70 }}>Seq.</th>
                      <th>Característica</th>
                      <th>Variável</th>
                    </tr>
                  </thead>
                  <tbody>
                    {linhas.map(l => {
                      const chars = MOCK_CARACTERISTICAS_POR_ITEM[item] ?? [];
                      const caracData = chars.find(c => c.caracteristica === l.caracteristica);
                      return (
                        <tr key={l.seq}>
                          <td style={{ fontWeight: 600, color: "#3e9654" }}>{l.seq}</td>
                          <td>{l.caracteristica}</td>
                          <td>
                            <select className="mas-select" style={{ maxWidth: 280 }} value={l.variavel} onChange={e => setVariavel(l.seq, e.target.value)}>
                              <option value="">— Selecione —</option>
                              {(caracData?.variaveis ?? []).map(v => <option key={v} value={v}>{v}</option>)}
                            </select>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              )}
            </div>

            {/* Results */}
            {mostrarResultados && (
              <div className="mas-results-wrap">
                <div className="mas-results-bar">
                  <div className="mas-results-bar-left">
                    <svg width="13" height="13" viewBox="0 0 16 16" fill="none"><path d="M2 4h12M2 8h12M2 12h8" stroke="#5a8068" strokeWidth="1.4" strokeLinecap="round" /></svg>
                    <span className="mas-results-bar-label">Máscaras Geradas</span>
                    <span className="mas-card-badge">{resultados.length} máscara(s)</span>
                  </div>
                  <button className="mas-btn mas-btn-ghost mas-btn-sm" onClick={() => setMostrarResultados(false)}>Fechar</button>
                </div>

                {resultados.length === 0 ? (
                  <div className="mas-results-empty">Nenhuma máscara gerada.</div>
                ) : (
                  <table className="mas-results-table">
                    <thead>
                      <tr>
                        <th style={{ width: 120 }}>Máscara</th>
                        <th style={{ width: 100 }}>Item</th>
                        <th>Descrição</th>
                        <th>Características</th>
                      </tr>
                    </thead>
                    <tbody>
                      {resultados.map((m, i) => (
                        <tr key={i}>
                          <td style={{ fontWeight: 600, color: "#1a4a2a" }}>{m.mascara}</td>
                          <td>{m.item}</td>
                          <td>{m.descricao}</td>
                          <td>{m.caracteristicas}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                )}
              </div>
            )}
          </div>
        </div>
      </div>
    </>
  );
}
