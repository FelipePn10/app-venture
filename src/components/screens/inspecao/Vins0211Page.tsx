import { useState, useCallback } from "react";
import { humanizeApiError } from '@/services/apiError';
import {
  createTipoRoteiro,
  type TipoRoteiroDTO,
} from "@/services/inspecaoService";

type FeedbackState = { type: "success" | "error" | "info"; message: string } | null;

function normalizeError(error: unknown, fallback: string): string {
  return humanizeApiError(error, fallback);
}

export function Vins0211Page(): JSX.Element {
  const [codigo, setCodigo] = useState("");
  const [descricao, setDescricao] = useState("");
  const [feedback, setFeedback] = useState<FeedbackState>(null);
  const [isSaving, setIsSaving] = useState(false);

  const setField = useCallback(<K extends keyof TipoRoteiroDTO>(key: K, value: TipoRoteiroDTO[K]) => {
    if (key === "codigo") setCodigo(value as string);
    else setDescricao(value as string);
    setFeedback(null);
  }, []);

  async function handleSalvar() {
    if (!descricao.trim()) {
      setFeedback({ type: "error", message: "Descrição obrigatória." });
      return;
    }
    setIsSaving(true);
    setFeedback(null);
    try {
      const dto: TipoRoteiroDTO = { codigo: codigo.trim(), descricao: descricao.trim() };
      await createTipoRoteiro(dto);
      setFeedback({ type: "success", message: "Tipo de roteiro salvo com sucesso." });
    } catch (error) {
      setFeedback({ type: "error", message: normalizeError(error, "Erro ao salvar tipo de roteiro.") });
    } finally {
      setIsSaving(false);
    }
  }

  function handleLimpar() {
    setCodigo("");
    setDescricao("");
    setFeedback(null);
  }

  return (
    <>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Inter:wght@300;400;500;600&display=swap');
        *, *::before, *::after { box-sizing: border-box; margin: 0; padding: 0; }

        .ins8-r{min-height:100vh;background:#dfe4e0;font-family:'Inter',sans-serif;color:#1c2b22;display:flex;flex-direction:column}

        .ins8-tb{height:52px;background:#16281d;display:flex;align-items:center;justify-content:space-between;padding:0 20px;flex-shrink:0;border-bottom:1px solid rgba(62,150,84,0.15)}
        .ins8-tbl{display:flex;align-items:center;gap:10px}
        .ins8-lg{width:28px;height:28px;background:#2f7d47;border-radius:6px;display:flex;align-items:center;justify-content:center}
        .ins8-an{font-size:13px;font-weight:600;color:#e0f0e3;line-height:1.1}
        .ins8-asb{display:block;font-size:9px;font-weight:400;color:#54655a}
        .ins8-st{font-size:12.5px;font-weight:500;color:#3f8a58;padding-left:14px;margin-left:14px;border-left:1px solid rgba(255,255,255,0.08)}

        .ins8-ab{background:#fff;border-bottom:1px solid #dbe8d5;padding:0 20px;display:flex;align-items:center;gap:4px;height:46px;flex-shrink:0}
        .ins8-ag{display:flex;align-items:center;gap:4px;padding-right:12px;margin-right:8px;border-right:1px solid #e8f0e4}
        .ins8-ag:last-child{border-right:none}
        .ins8-al{font-size:9.5px;font-weight:600;letter-spacing:0.8px;text-transform:uppercase;color:#94a49a;margin-right:4px;white-space:nowrap}
        .ins8-bt{display:inline-flex;align-items:center;gap:6px;height:32px;padding:0 12px;border:1.5px solid transparent;border-radius:7px;font-family:'Inter',sans-serif;font-size:12.5px;font-weight:500;cursor:pointer;white-space:nowrap;transition:background 0.13s,border-color 0.13s,color 0.13s}
        .ins8-bt-p{background:#16281d;color:#dff0e2;border-color:#16281d}
        .ins8-bt-p:hover:not(:disabled){background:#1e3728}
        .ins8-bt-p:disabled{opacity:0.5;cursor:not-allowed}
        .ins8-bt-g{background:transparent;color:#46574c;border-color:#d4e8d0}
        .ins8-bt-g:hover:not(:disabled){background:#f0f8ec;border-color:#a9b6ac;color:#1c2b22}
        .ins8-bt-d{background:transparent;color:#b94040;border-color:#f0c8c8}
        .ins8-bt-d:hover:not(:disabled){background:#fff0f0;border-color:#e09090}

        .ins8-by{flex:1;padding:16px 20px;display:flex;flex-direction:column;gap:0;overflow-y:auto}
        .ins8-by::-webkit-scrollbar{width:5px}
        .ins8-by::-webkit-scrollbar-thumb{background:#cce0c8;border-radius:4px}

        .ins8-sb{display:flex;align-items:center;gap:10px;padding:14px 0 8px}
        .ins8-sb:first-child{padding-top:0}
        .ins8-sb-p{font-size:9.5px;font-weight:700;letter-spacing:1.2px;text-transform:uppercase;color:#6b7d71;background:#e0ede0;border:1px solid #c8dcc8;border-radius:20px;padding:3px 10px;white-space:nowrap}
        .ins8-sb-l{flex:1;height:1px;background:#dbe8d5}
        .ins8-sb-h{font-size:11px;color:#94a49a;white-space:nowrap}

        .ins8-c{background:#fff;border:1px solid #dbe8d5;border-radius:12px;overflow:hidden;margin-bottom:14px}
        .ins8-ch{display:flex;align-items:center;justify-content:space-between;padding:12px 18px;border-bottom:1px solid #edf5e8;background:#fafcf9}
        .ins8-chl{display:flex;align-items:center;gap:8px}
        .ins8-ct{font-size:12px;font-weight:600;color:#253a2d;text-transform:uppercase;letter-spacing:0.6px}
        .ins8-cb{padding:18px 18px}

        .ins8-g{display:grid;grid-template-columns:repeat(12,1fr);gap:16px 14px;align-items:start}
        .ins8-g2{grid-column:span 2}
        .ins8-g10{grid-column:span 10}

        .ins8-f{display:flex;flex-direction:column;gap:5px}
        .ins8-l{font-size:10.5px;font-weight:600;color:#6b7d71;text-transform:uppercase;letter-spacing:0.4px;display:flex;align-items:center;gap:4px}
        .ins8-lr{color:#c84040;font-size:12px;line-height:1}
        .ins8-in{width:100%;height:36px;background:#f8fbf6;border:1.5px solid #d4e8cc;border-radius:7px;padding:0 10px;font-family:'Inter',sans-serif;font-size:13px;color:#1c2b22;outline:none;transition:border-color 0.13s,box-shadow 0.13s}
        .ins8-in:focus{border-color:#2f7d47;box-shadow:0 0 0 2px rgba(62,150,84,0.1)}
        .ins8-in::placeholder{color:#a9b6ac;font-size:12px}
        .ins8-in:disabled{background:#dfe4e0;color:#8aaa94;cursor:not-allowed;border-color:#e0ead8}
        .ins8-fe{font-size:11px;color:#c84040;margin-top:2px;display:flex;align-items:center;gap:4px}
        .ins8-fh{font-size:11px;color:#7a9c84;margin-top:2px;line-height:1.45}

        .ins8-fb{display:flex;align-items:center;gap:9px;padding:11px 15px;border-radius:9px;font-size:13px;animation:ins8FdIn 0.2s ease;margin-bottom:14px}
        .ins8-fb.s{background:#f0faf2;border:1px solid #b4dec0;color:#1e6030}
        .ins8-fb.e{background:#fff5f5;border:1px solid #f8c0c0;border-left:3px solid #e05252;color:#b91c1c}
        .ins8-fb.i{background:#f0f8ff;border:1px solid #c7def8;border-left:3px solid #4a90d9;color:#1a4070}

        .ins8-ft{background:#fff;border-top:1px solid #dbe8d5;padding:8px 20px;display:flex;align-items:center;justify-content:space-between;flex-shrink:0}
        .ins8-ftl{display:flex;align-items:center;gap:20px}
        .ins8-fts{display:flex;align-items:center;gap:6px;font-size:11.5px;color:#6b7d71}
        .ins8-fts strong{color:#1c2b22;font-weight:600}

        @keyframes ins8Spin{to{transform:rotate(360deg)}}
        .ins8-sp{width:14px;height:14px;flex-shrink:0;border:2px solid rgba(223,240,226,0.3);border-top-color:#dff0e2;border-radius:50%;animation:ins8Spin 0.65s linear infinite}
        .ins8-spd{width:14px;height:14px;flex-shrink:0;border:2px solid #d4e8cc;border-top-color:#2f7d47;border-radius:50%;animation:ins8Spin 0.65s linear infinite}
        @keyframes ins8FdIn{from{opacity:0;transform:translateY(-4px)}to{opacity:1;transform:translateY(0)}}
      `}</style>

      <div className="ins8-r">
        <header className="ins8-tb">
          <div className="ins8-tbl">
            <div className="ins8-lg">
              <svg width="15" height="15" viewBox="0 0 18 18" fill="none">
                <rect x="1.5" y="1.5" width="6" height="6" rx="1.2" fill="rgba(255,255,255,0.9)" />
                <rect x="10.5" y="1.5" width="6" height="6" rx="1.2" fill="rgba(255,255,255,0.4)" />
                <rect x="1.5" y="10.5" width="6" height="6" rx="1.2" fill="rgba(255,255,255,0.4)" />
                <rect x="10.5" y="10.5" width="6" height="6" rx="1.2" fill="rgba(255,255,255,0.7)" />
              </svg>
            </div>
            <span className="ins8-an">Venture<span className="ins8-asb">ERP &amp; Soluções</span></span>
            <span className="ins8-st">VINS0211 — Cadastro de Tipos de Roteiro de Inspeção</span>
          </div>
        </header>

        <div className="ins8-ab">
          <div className="ins8-ag">
            <span className="ins8-al">Ações</span>
            <button className="ins8-bt ins8-bt-p" onClick={() => void handleSalvar()} disabled={isSaving}>
              {isSaving ? <><div className="ins8-sp" />Salvando...</> : <><svg width="13" height="13" viewBox="0 0 16 16" fill="none"><path d="M2 2h9l3 3v9a1 1 0 01-1 1H3a1 1 0 01-1-1V3a1 1 0 011-1z" stroke="currentColor" strokeWidth="1.4" strokeLinejoin="round" /><path d="M5 2v4h6V2M5 9h6" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" /></svg>Salvar</>}
            </button>
            <button className="ins8-bt ins8-bt-d" onClick={handleLimpar} disabled={isSaving}>
              <svg width="13" height="13" viewBox="0 0 16 16" fill="none"><path d="M3 3l10 10M13 3L3 13" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" /></svg>Limpar
            </button>
          </div>
          <div className="ins8-ag">
            <button className="ins8-bt ins8-bt-g">
              <svg width="13" height="13" viewBox="0 0 16 16" fill="none"><circle cx="8" cy="8" r="6" stroke="currentColor" strokeWidth="1.4" /><path d="M8 7v4M8 5.5h.01" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" /></svg>Ajuda
            </button>
          </div>
        </div>

        <div className="ins8-by">
          {feedback && (
            <div className={`ins8-fb ${feedback.type === "success" ? "s" : feedback.type === "error" ? "e" : "i"}`}>
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

          <div className="ins8-sb">
            <span className="ins8-sb-p">Cadastro</span>
            <div className="ins8-sb-l" />
            <span className="ins8-sb-h">Preencha os campos e clique em Salvar</span>
          </div>

          <div className="ins8-c">
            <div className="ins8-ch">
              <div className="ins8-chl">
                <svg width="14" height="14" viewBox="0 0 16 16" fill="none"><path d="M2 2h9l3 3v9a1 1 0 01-1 1H3a1 1 0 01-1-1V3a1 1 0 011-1z" stroke="#2f7d47" strokeWidth="1.4" strokeLinejoin="round" /><path d="M5 2v4h6V2M5 9h6" stroke="#2f7d47" strokeWidth="1.4" strokeLinecap="round" /></svg>
                <span className="ins8-ct">Tipo de Roteiro de Inspeção</span>
              </div>
            </div>
            <div className="ins8-cb">
              <div className="ins8-g">
                <div className="ins8-f ins8-g2">
                  <label className="ins8-l">Código (auto)</label>
                  <input className="ins8-in" placeholder="Automático" value={codigo} onChange={(e) => setField("codigo", e.target.value)} disabled />
                  <span className="ins8-fh">Gerado automaticamente ao salvar.</span>
                </div>
                <div className="ins8-f ins8-g10">
                  <label className="ins8-l">Descrição <span className="ins8-lr">*</span></label>
                  <input className="ins8-in" placeholder="Ex: Normal, Simplificada, Restrita" value={descricao} onChange={(e) => setField("descricao", e.target.value)} maxLength={100} />
                </div>
              </div>
            </div>
          </div>
        </div>

        <footer className="ins8-ft">
          <div className="ins8-ftl">
            <div className="ins8-fts">Módulo: <strong>Inspeção</strong></div>
            <div className="ins8-fts">Tela: <strong>VINS0211</strong></div>
          </div>
          <div className="ins8-fts" style={{gap:8}}><span style={{color:"#a9b6ac",fontSize:11}}>GRUPO VENTURE LTDA</span></div>
        </footer>
      </div>
    </>
  );
}
