import { useState } from "react";
import {
  createAbonoDivergencia,
  type AbonoDivergenciaDTO,
} from "@/services/inspecaoService";

type FeedbackState = { type: "success" | "error" | "info"; message: string } | null;

function normalizeError(error: unknown, fallback: string): string {
  if (error && typeof error === "object" && "response" in error) {
    const resp = (error as any).response;
    if (resp?.data?.message) return String(resp.data.message);
  }
  return error instanceof Error ? error.message : fallback;
}

export function Vavf0105Page(): JSX.Element {
  const [descricao, setDescricao] = useState("");
  const [feedback, setFeedback] = useState<FeedbackState>(null);
  const [isSaving, setIsSaving] = useState(false);

  async function handleCadastrar() {
    if (!descricao.trim()) {
      setFeedback({ type: "error", message: "Descrição obrigatória." });
      return;
    }
    setIsSaving(true);
    setFeedback(null);
    try {
      const dto: AbonoDivergenciaDTO = { descricao: descricao.trim() };
      await createAbonoDivergencia(dto);
      setFeedback({ type: "success", message: "Tipo de abono cadastrado com sucesso." });
    } catch (error) {
      setFeedback({ type: "error", message: normalizeError(error, "Erro ao cadastrar tipo de abono.") });
    } finally {
      setIsSaving(false);
    }
  }

  async function handleSalvar() {
    await handleCadastrar();
  }

  function handleLimpar() {
    setDescricao("");
    setFeedback(null);
  }

  return (
    <>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Inter:wght@300;400;500;600&display=swap');
        *, *::before, *::after { box-sizing: border-box; margin: 0; padding: 0; }

        .avf-r{min-height:100vh;background:#f0f4ee;font-family:'Inter',sans-serif;color:#1a2e22;display:flex;flex-direction:column}

        .avf-tb{height:52px;background:#162e20;display:flex;align-items:center;justify-content:space-between;padding:0 20px;flex-shrink:0;border-bottom:1px solid rgba(62,150,84,0.15)}
        .avf-tbl{display:flex;align-items:center;gap:10px}
        .avf-lg{width:28px;height:28px;background:#3e9654;border-radius:6px;display:flex;align-items:center;justify-content:center}
        .avf-an{font-size:13px;font-weight:600;color:#e0f0e3;line-height:1.1}
        .avf-asb{display:block;font-size:9px;font-weight:400;color:#3d6b4d}
        .avf-st{font-size:12.5px;font-weight:500;color:#5a9a6a;padding-left:14px;margin-left:14px;border-left:1px solid rgba(255,255,255,0.08)}

        .avf-ab{background:#fff;border-bottom:1px solid #dbe8d5;padding:0 20px;display:flex;align-items:center;gap:4px;height:46px;flex-shrink:0}
        .avf-ag{display:flex;align-items:center;gap:4px;padding-right:12px;margin-right:8px;border-right:1px solid #e8f0e4}
        .avf-ag:last-child{border-right:none}
        .avf-al{font-size:9.5px;font-weight:600;letter-spacing:0.8px;text-transform:uppercase;color:#96b8a0;margin-right:4px;white-space:nowrap}
        .avf-bt{display:inline-flex;align-items:center;gap:6px;height:32px;padding:0 12px;border:1.5px solid transparent;border-radius:7px;font-family:'Inter',sans-serif;font-size:12.5px;font-weight:500;cursor:pointer;white-space:nowrap;transition:background 0.13s,border-color 0.13s,color 0.13s}
        .avf-bt-p{background:#162e20;color:#dff0e2;border-color:#162e20}
        .avf-bt-p:hover:not(:disabled){background:#1e3a2a}
        .avf-bt-p:disabled{opacity:0.5;cursor:not-allowed}
        .avf-bt-g{background:transparent;color:#4a7060;border-color:#d4e8d0}
        .avf-bt-g:hover:not(:disabled){background:#f0f8ec;border-color:#b0d4b8;color:#1a3828}
        .avf-bt-g:disabled{opacity:0.5;cursor:not-allowed}
        .avf-bt-d{background:transparent;color:#b94040;border-color:#f0c8c8}
        .avf-bt-d:hover:not(:disabled){background:#fff0f0;border-color:#e09090}
        .avf-bt-n{background:#eef9f0;color:#1a6030;border-color:#b4d8b8;font-weight:600}
        .avf-bt-n:hover:not(:disabled){background:#dff5e4;border-color:#88c898}

        .avf-by{flex:1;padding:16px 20px;display:flex;flex-direction:column;gap:0;overflow-y:auto}
        .avf-by::-webkit-scrollbar{width:5px}
        .avf-by::-webkit-scrollbar-thumb{background:#cce0c8;border-radius:4px}

        .avf-sb{display:flex;align-items:center;gap:10px;padding:14px 0 8px}
        .avf-sb:first-child{padding-top:0}
        .avf-sb-p{font-size:9.5px;font-weight:700;letter-spacing:1.2px;text-transform:uppercase;color:#5a8068;background:#e0ede0;border:1px solid #c8dcc8;border-radius:20px;padding:3px 10px;white-space:nowrap}
        .avf-sb-l{flex:1;height:1px;background:#dbe8d5}
        .avf-sb-h{font-size:11px;color:#96b8a0;white-space:nowrap}

        .avf-c{background:#fff;border:1px solid #dbe8d5;border-radius:12px;overflow:hidden;margin-bottom:14px}
        .avf-ch{display:flex;align-items:center;justify-content:space-between;padding:12px 18px;border-bottom:1px solid #edf5e8;background:#fafcf9}
        .avf-chl{display:flex;align-items:center;gap:8px}
        .avf-ct{font-size:12px;font-weight:600;color:#2a4a35;text-transform:uppercase;letter-spacing:0.6px}
        .avf-cb{padding:18px 18px}

        .avf-g{display:grid;grid-template-columns:repeat(12,1fr);gap:16px 14px;align-items:start}
        .avf-g12{grid-column:span 12}

        .avf-f{display:flex;flex-direction:column;gap:5px}
        .avf-l{font-size:10.5px;font-weight:600;color:#5a8068;text-transform:uppercase;letter-spacing:0.4px;display:flex;align-items:center;gap:4px}
        .avf-lr{color:#c84040;font-size:12px;line-height:1}
        .avf-in{width:100%;height:36px;background:#f8fbf6;border:1.5px solid #d4e8cc;border-radius:7px;padding:0 10px;font-family:'Inter',sans-serif;font-size:13px;color:#1a2e22;outline:none;transition:border-color 0.13s,box-shadow 0.13s}
        .avf-in:focus{border-color:#3e9654;box-shadow:0 0 0 2px rgba(62,150,84,0.1)}
        .avf-in::placeholder{color:#b0c8b8;font-size:12px}
        .avf-in.has-e{border-color:#e05252;box-shadow:0 0 0 2px rgba(224,82,82,0.1)}
        .avf-fe{font-size:11px;color:#c84040;margin-top:2px;display:flex;align-items:center;gap:4px}
        .avf-fh{font-size:11px;color:#7a9c84;margin-top:2px;line-height:1.45}

        .avf-fb{display:flex;align-items:center;gap:9px;padding:11px 15px;border-radius:9px;font-size:13px;animation:avfFdIn 0.2s ease;margin-bottom:14px}
        .avf-fb.s{background:#f0faf2;border:1px solid #b4dec0;color:#1e6030}
        .avf-fb.e{background:#fff5f5;border:1px solid #f8c0c0;border-left:3px solid #e05252;color:#b91c1c}
        .avf-fb.i{background:#f0f8ff;border:1px solid #c7def8;border-left:3px solid #4a90d9;color:#1a4070}

        .avf-ft{background:#fff;border-top:1px solid #dbe8d5;padding:8px 20px;display:flex;align-items:center;justify-content:space-between;flex-shrink:0}
        .avf-ftl{display:flex;align-items:center;gap:20px}
        .avf-fts{display:flex;align-items:center;gap:6px;font-size:11.5px;color:#6a8a74}
        .avf-fts strong{color:#1a2e22;font-weight:600}

        @keyframes avfSpin{to{transform:rotate(360deg)}}
        .avf-sp{width:14px;height:14px;flex-shrink:0;border:2px solid rgba(223,240,226,0.3);border-top-color:#dff0e2;border-radius:50%;animation:avfSpin 0.65s linear infinite}
        .avf-spd{width:14px;height:14px;flex-shrink:0;border:2px solid #d4e8cc;border-top-color:#3e9654;border-radius:50%;animation:avfSpin 0.65s linear infinite}
        @keyframes avfFdIn{from{opacity:0;transform:translateY(-4px)}to{opacity:1;transform:translateY(0)}}
      `}</style>

      <div className="avf-r">
        <header className="avf-tb">
          <div className="avf-tbl">
            <div className="avf-lg">
              <svg width="15" height="15" viewBox="0 0 18 18" fill="none">
                <rect x="1.5" y="1.5" width="6" height="6" rx="1.2" fill="rgba(255,255,255,0.9)" />
                <rect x="10.5" y="1.5" width="6" height="6" rx="1.2" fill="rgba(255,255,255,0.4)" />
                <rect x="1.5" y="10.5" width="6" height="6" rx="1.2" fill="rgba(255,255,255,0.4)" />
                <rect x="10.5" y="10.5" width="6" height="6" rx="1.2" fill="rgba(255,255,255,0.7)" />
              </svg>
            </div>
            <span className="avf-an">Venture<span className="avf-asb">ERP &amp; Soluções</span></span>
            <span className="avf-st">VAVF0105 — Cadastro de Tipos de Abono para Divergências</span>
          </div>
        </header>

        <div className="avf-ab">
          <div className="avf-ag">
            <span className="avf-al">Cadastro</span>
            <button className="avf-bt avf-bt-n" onClick={() => void handleCadastrar()} disabled={isSaving}>
              {isSaving ? <><div className="avf-spd" />Cadastrando...</> : <><svg width="12" height="12" viewBox="0 0 12 12" fill="none"><path d="M6 2v8M2 6h8" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" /></svg>Cadastrar</>}
            </button>
          </div>
          <div className="avf-ag">
            <span className="avf-al">Ações</span>
            <button className="avf-bt avf-bt-p" onClick={() => void handleSalvar()} disabled={isSaving}>
              {isSaving ? <><div className="avf-sp" />Salvando...</> : <><svg width="13" height="13" viewBox="0 0 16 16" fill="none"><path d="M2 2h9l3 3v9a1 1 0 01-1 1H3a1 1 0 01-1-1V3a1 1 0 011-1z" stroke="currentColor" strokeWidth="1.4" strokeLinejoin="round" /><path d="M5 2v4h6V2M5 9h6" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" /></svg>Salvar</>}
            </button>
            <button className="avf-bt avf-bt-d" onClick={handleLimpar} disabled={isSaving}>
              <svg width="13" height="13" viewBox="0 0 16 16" fill="none"><path d="M3 3l10 10M13 3L3 13" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" /></svg>Limpar
            </button>
          </div>
          <div className="avf-ag">
            <button className="avf-bt avf-bt-g">
              <svg width="13" height="13" viewBox="0 0 16 16" fill="none"><circle cx="8" cy="8" r="6" stroke="currentColor" strokeWidth="1.4" /><path d="M8 7v4M8 5.5h.01" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" /></svg>Ajuda
            </button>
          </div>
        </div>

        <div className="avf-by">
          {feedback && (
            <div className={`avf-fb ${feedback.type === "success" ? "s" : feedback.type === "error" ? "e" : "i"}`}>
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

          <div className="avf-sb">
            <span className="avf-sb-p">Cadastro</span>
            <div className="avf-sb-l" />
            <span className="avf-sb-h">Preencha a descrição e clique em Cadastrar</span>
          </div>

          <div className="avf-c">
            <div className="avf-ch">
              <div className="avf-chl">
                <svg width="14" height="14" viewBox="0 0 16 16" fill="none"><path d="M2 2h9l3 3v9a1 1 0 01-1 1H3a1 1 0 01-1-1V3a1 1 0 011-1z" stroke="#3e9654" strokeWidth="1.4" strokeLinejoin="round" /><path d="M5 2v4h6V2M5 9h6" stroke="#3e9654" strokeWidth="1.4" strokeLinecap="round" /></svg>
                <span className="avf-ct">Tipo de Abono para Divergências</span>
              </div>
            </div>
            <div className="avf-cb">
              <div className="avf-g">
                <div className="avf-f avf-g12">
                  <label className="avf-l">Descrição <span className="avf-lr">*</span></label>
                  <input className="avf-in" placeholder="Descrição do tipo de abono" value={descricao} onChange={(e) => setDescricao(e.target.value)} maxLength={200} />
                  <span className="avf-fh">Ex: Divergência de quantidade, avaria no transporte, etc.</span>
                </div>
              </div>
            </div>
          </div>
        </div>

        <footer className="avf-ft">
          <div className="avf-ftl">
            <div className="avf-fts">Módulo: <strong>Inspeção</strong></div>
            <div className="avf-fts">Tela: <strong>VAVF0105</strong></div>
          </div>
          <div className="avf-fts" style={{gap:8}}><span style={{color:"#b0c8b8",fontSize:11}}>GRUPO VENTURE LTDA</span></div>
        </footer>
      </div>
    </>
  );
}
