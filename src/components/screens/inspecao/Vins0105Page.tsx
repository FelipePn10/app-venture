import { useState, useCallback } from "react";
import { humanizeApiError } from '@/services/apiError';
import {
  createTipoOcorrencia,
  type TipoOcorrenciaDTO,
} from "@/services/inspecaoService";

type FeedbackState = { type: "success" | "error" | "info"; message: string } | null;

interface FormTipoOcorrencia {
  codigo: string;
  descricao: string;
  email: boolean;
  layout: string;
  nao_conformidade: boolean;
  disposicao: boolean;
  causa: boolean;
  acoes_corretivas: boolean;
  acoes_preventivas: boolean;
  verificacao_acoes: boolean;
  fechamento: boolean;
}

const LAYOUTS = ["Padrão", "Simplificado", "Detalhado", "Relatório Técnico"];

const FORM_INICIAL: FormTipoOcorrencia = {
  codigo: "",
  descricao: "",
  email: false,
  layout: "Padrão",
  nao_conformidade: false,
  disposicao: false,
  causa: false,
  acoes_corretivas: false,
  acoes_preventivas: false,
  verificacao_acoes: false,
  fechamento: false,
};

function normalizeError(error: unknown, fallback: string): string {
  return humanizeApiError(error, fallback);
}

export function Vins0105Page(): JSX.Element {
  const [form, setForm] = useState<FormTipoOcorrencia>(FORM_INICIAL);
  const [feedback, setFeedback] = useState<FeedbackState>(null);
  const [isSaving, setIsSaving] = useState(false);

  const setField = useCallback(<K extends keyof FormTipoOcorrencia>(key: K, value: FormTipoOcorrencia[K]) => {
    setForm((prev) => ({ ...prev, [key]: value }));
    setFeedback(null);
  }, []);

  async function handleSalvar() {
    if (!form.descricao.trim()) {
      setFeedback({ type: "error", message: "Descrição obrigatória." });
      return;
    }
    setIsSaving(true);
    setFeedback(null);
    try {
      const dto: TipoOcorrenciaDTO = { ...form, descricao: form.descricao.trim() };
      await createTipoOcorrencia(dto);
      setFeedback({ type: "success", message: `Tipo de ocorrência salvo com sucesso.` });
    } catch (error) {
      setFeedback({ type: "error", message: normalizeError(error, "Erro ao salvar tipo de ocorrência.") });
    } finally {
      setIsSaving(false);
    }
  }

  function handleNovo() {
    setForm(FORM_INICIAL);
    setFeedback(null);
  }

  function handleLimpar() {
    setForm(FORM_INICIAL);
    setFeedback(null);
  }

  return (
    <>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Inter:wght@300;400;500;600&display=swap');
        *, *::before, *::after { box-sizing: border-box; margin: 0; padding: 0; }

        .ins-r{min-height:100vh;background:#dfe4e0;font-family:'Inter',sans-serif;color:#1c2b22;display:flex;flex-direction:column}

        .ins-tb{height:52px;background:#16281d;display:flex;align-items:center;justify-content:space-between;padding:0 20px;flex-shrink:0;border-bottom:1px solid rgba(62,150,84,0.15)}
        .ins-tbl{display:flex;align-items:center;gap:10px}
        .ins-lg{width:28px;height:28px;background:#2f7d47;border-radius:6px;display:flex;align-items:center;justify-content:center}
        .ins-an{font-size:13px;font-weight:600;color:#e0f0e3;line-height:1.1}
        .ins-asb{display:block;font-size:9px;font-weight:400;color:#54655a}
        .ins-st{font-size:12.5px;font-weight:500;color:#3f8a58;padding-left:14px;margin-left:14px;border-left:1px solid rgba(255,255,255,0.08)}

        .ins-ab{background:#fff;border-bottom:1px solid #dbe8d5;padding:0 20px;display:flex;align-items:center;gap:4px;height:46px;flex-shrink:0}
        .ins-ag{display:flex;align-items:center;gap:4px;padding-right:12px;margin-right:8px;border-right:1px solid #e8f0e4}
        .ins-ag:last-child{border-right:none}
        .ins-al{font-size:9.5px;font-weight:600;letter-spacing:0.8px;text-transform:uppercase;color:#94a49a;margin-right:4px;white-space:nowrap}
        .ins-bt{display:inline-flex;align-items:center;gap:6px;height:32px;padding:0 12px;border:1.5px solid transparent;border-radius:7px;font-family:'Inter',sans-serif;font-size:12.5px;font-weight:500;cursor:pointer;white-space:nowrap;transition:background 0.13s,border-color 0.13s,color 0.13s}
        .ins-bt-p{background:#16281d;color:#dff0e2;border-color:#16281d}
        .ins-bt-p:hover:not(:disabled){background:#1e3728}
        .ins-bt-p:disabled{opacity:0.5;cursor:not-allowed}
        .ins-bt-g{background:transparent;color:#46574c;border-color:#d4e8d0}
        .ins-bt-g:hover:not(:disabled){background:#f0f8ec;border-color:#a9b6ac;color:#1c2b22}
        .ins-bt-g:disabled{opacity:0.5;cursor:not-allowed}
        .ins-bt-d{background:transparent;color:#b94040;border-color:#f0c8c8}
        .ins-bt-d:hover:not(:disabled){background:#fff0f0;border-color:#e09090}
        .ins-bt-n{background:#eef9f0;color:#1a6030;border-color:#b4d8b8;font-weight:600}
        .ins-bt-n:hover:not(:disabled){background:#dff5e4;border-color:#88c898}

        .ins-by{flex:1;padding:16px 20px;display:flex;flex-direction:column;gap:0;overflow-y:auto}
        .ins-by::-webkit-scrollbar{width:5px}
        .ins-by::-webkit-scrollbar-thumb{background:#cce0c8;border-radius:4px}

        .ins-sb{display:flex;align-items:center;gap:10px;padding:14px 0 8px}
        .ins-sb:first-child{padding-top:0}
        .ins-sb-p{font-size:9.5px;font-weight:700;letter-spacing:1.2px;text-transform:uppercase;color:#6b7d71;background:#e0ede0;border:1px solid #c8dcc8;border-radius:20px;padding:3px 10px;white-space:nowrap}
        .ins-sb-l{flex:1;height:1px;background:#dbe8d5}
        .ins-sb-h{font-size:11px;color:#94a49a;white-space:nowrap}

        .ins-c{background:#fff;border:1px solid #dbe8d5;border-radius:12px;overflow:hidden;margin-bottom:14px}
        .ins-ch{display:flex;align-items:center;justify-content:space-between;padding:12px 18px;border-bottom:1px solid #edf5e8;background:#fafcf9}
        .ins-chl{display:flex;align-items:center;gap:8px}
        .ins-ct{font-size:12px;font-weight:600;color:#253a2d;text-transform:uppercase;letter-spacing:0.6px}
        .ins-cb{padding:18px 18px}

        .ins-g{display:grid;grid-template-columns:repeat(12,1fr);gap:16px 14px;align-items:start}
        .ins-g2{grid-column:span 2}
        .ins-g3{grid-column:span 3}
        .ins-g4{grid-column:span 4}
        .ins-g6{grid-column:span 6}
        .ins-g8{grid-column:span 8}
        .ins-g12{grid-column:span 12}

        .ins-f{display:flex;flex-direction:column;gap:5px}
        .ins-l{font-size:10.5px;font-weight:600;color:#6b7d71;text-transform:uppercase;letter-spacing:0.4px;display:flex;align-items:center;gap:4px}
        .ins-lr{color:#c84040;font-size:12px;line-height:1}
        .ins-in{width:100%;height:36px;background:#f8fbf6;border:1.5px solid #d4e8cc;border-radius:7px;padding:0 10px;font-family:'Inter',sans-serif;font-size:13px;color:#1c2b22;outline:none;transition:border-color 0.13s,box-shadow 0.13s}
        .ins-in:focus{border-color:#2f7d47;box-shadow:0 0 0 2px rgba(62,150,84,0.1)}
        .ins-in::placeholder{color:#a9b6ac;font-size:12px}
        .ins-in.has-e{border-color:#e05252;box-shadow:0 0 0 2px rgba(224,82,82,0.1)}
        .ins-se{width:100%;height:36px;background:#f8fbf6;border:1.5px solid #d4e8cc;border-radius:7px;padding:0 28px 0 10px;font-family:'Inter',sans-serif;font-size:13px;color:#1c2b22;outline:none;appearance:none;cursor:pointer;background-image:url("data:image/svg+xml,%3Csvg width='10' height='6' viewBox='0 0 10 6' xmlns='http://www.w3.org/2000/svg'%3E%3Cpath d='M1 1l4 4 4-4' stroke='%23789a84' stroke-width='1.5' fill='none' stroke-linecap='round' stroke-linejoin='round'/%3E%3C/svg%3E");background-repeat:no-repeat;background-position:right 10px center;transition:border-color 0.13s}
        .ins-se:focus{border-color:#2f7d47;box-shadow:0 0 0 2px rgba(62,150,84,0.1)}
        .ins-fe{font-size:11px;color:#c84040;margin-top:2px;display:flex;align-items:center;gap:4px}
        .ins-fh{font-size:11px;color:#7a9c84;margin-top:2px;line-height:1.45}

        .ins-toggle-row{display:flex;align-items:center;gap:10px;padding-top:4px}
        .ins-toggle{position:relative;width:38px;height:20px;flex-shrink:0;cursor:pointer}
        .ins-toggle input{opacity:0;width:0;height:0;position:absolute}
        .ins-toggle-track{position:absolute;inset:0;background:#d4e0d0;border-radius:20px;transition:background 0.2s}
        .ins-toggle input:checked~.ins-toggle-track{background:#2f7d47}
        .ins-toggle-thumb{position:absolute;top:3px;left:3px;width:14px;height:14px;background:#fff;border-radius:50%;transition:transform 0.2s;box-shadow:0 1px 3px rgba(0,0,0,0.15)}
        .ins-toggle input:checked~.ins-toggle-thumb{transform:translateX(18px)}
        .ins-toggle-label{font-size:12px;color:#46574c;font-weight:500}

        .ins-fb{display:flex;align-items:center;gap:9px;padding:11px 15px;border-radius:9px;font-size:13px;animation:insFdIn 0.2s ease;margin-bottom:14px}
        .ins-fb.s{background:#f0faf2;border:1px solid #b4dec0;color:#1e6030}
        .ins-fb.e{background:#fff5f5;border:1px solid #f8c0c0;border-left:3px solid #e05252;color:#b91c1c}
        .ins-fb.i{background:#f0f8ff;border:1px solid #c7def8;border-left:3px solid #4a90d9;color:#1a4070}

        .ins-ft{background:#fff;border-top:1px solid #dbe8d5;padding:8px 20px;display:flex;align-items:center;justify-content:space-between;flex-shrink:0}
        .ins-ftl{display:flex;align-items:center;gap:20px}
        .ins-fts{display:flex;align-items:center;gap:6px;font-size:11.5px;color:#6b7d71}
        .ins-fts strong{color:#1c2b22;font-weight:600}

        .ins-sep{height:1px;background:#edf5e8;margin:20px 0}
        .ins-sl{font-size:10px;font-weight:700;letter-spacing:1px;text-transform:uppercase;color:#a0b8a8;margin-bottom:14px;display:flex;align-items:center;gap:8px}
        .ins-sl::after{content:'';flex:1;height:1px;background:#e8f0e4}

        @keyframes insSpin{to{transform:rotate(360deg)}}
        .ins-sp{width:14px;height:14px;flex-shrink:0;border:2px solid rgba(223,240,226,0.3);border-top-color:#dff0e2;border-radius:50%;animation:insSpin 0.65s linear infinite}
        .ins-spd{width:14px;height:14px;flex-shrink:0;border:2px solid #d4e8cc;border-top-color:#2f7d47;border-radius:50%;animation:insSpin 0.65s linear infinite}
        @keyframes insFdIn{from{opacity:0;transform:translateY(-4px)}to{opacity:1;transform:translateY(0)}}
      `}</style>

      <div className="ins-r">
        <header className="ins-tb">
          <div className="ins-tbl">
            <div className="ins-lg">
              <svg width="15" height="15" viewBox="0 0 18 18" fill="none">
                <rect x="1.5" y="1.5" width="6" height="6" rx="1.2" fill="rgba(255,255,255,0.9)" />
                <rect x="10.5" y="1.5" width="6" height="6" rx="1.2" fill="rgba(255,255,255,0.4)" />
                <rect x="1.5" y="10.5" width="6" height="6" rx="1.2" fill="rgba(255,255,255,0.4)" />
                <rect x="10.5" y="10.5" width="6" height="6" rx="1.2" fill="rgba(255,255,255,0.7)" />
              </svg>
            </div>
            <span className="ins-an">Venture<span className="ins-asb">ERP &amp; Soluções</span></span>
            <span className="ins-st">VINS0105 — Cadastro de Tipos de Ocorrências</span>
          </div>
        </header>

        <div className="ins-ab">
          <div className="ins-ag">
            <span className="ins-al">Cadastro</span>
            <button className="ins-bt ins-bt-n" onClick={handleNovo} disabled={isSaving}>
              <svg width="12" height="12" viewBox="0 0 12 12" fill="none"><path d="M6 2v8M2 6h8" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" /></svg>Novo
            </button>
          </div>
          <div className="ins-ag">
            <span className="ins-al">Ações</span>
            <button className="ins-bt ins-bt-p" onClick={() => void handleSalvar()} disabled={isSaving}>
              {isSaving ? <><div className="ins-sp" />Salvando...</> : <><svg width="13" height="13" viewBox="0 0 16 16" fill="none"><path d="M2 2h9l3 3v9a1 1 0 01-1 1H3a1 1 0 01-1-1V3a1 1 0 011-1z" stroke="currentColor" strokeWidth="1.4" strokeLinejoin="round" /><path d="M5 2v4h6V2M5 9h6" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" /></svg>Salvar</>}
            </button>
            <button className="ins-bt ins-bt-d" onClick={handleLimpar} disabled={isSaving}>
              <svg width="13" height="13" viewBox="0 0 16 16" fill="none"><path d="M3 3l10 10M13 3L3 13" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" /></svg>Limpar
            </button>
          </div>
          <div className="ins-ag">
            <button className="ins-bt ins-bt-g">
              <svg width="13" height="13" viewBox="0 0 16 16" fill="none"><circle cx="8" cy="8" r="6" stroke="currentColor" strokeWidth="1.4" /><path d="M8 7v4M8 5.5h.01" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" /></svg>Ajuda
            </button>
          </div>
        </div>

        <div className="ins-by">
          {feedback && (
            <div className={`ins-fb ${feedback.type === "success" ? "s" : feedback.type === "error" ? "e" : "i"}`}>
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

          <div className="ins-sb">
            <span className="ins-sb-p">Cadastro</span>
            <div className="ins-sb-l" />
            <span className="ins-sb-h">Preencha os campos e clique em Salvar</span>
          </div>

          <div className="ins-c">
            <div className="ins-ch">
              <div className="ins-chl">
                <svg width="14" height="14" viewBox="0 0 16 16" fill="none"><path d="M2 2h9l3 3v9a1 1 0 01-1 1H3a1 1 0 01-1-1V3a1 1 0 011-1z" stroke="#2f7d47" strokeWidth="1.4" strokeLinejoin="round" /><path d="M5 2v4h6V2M5 9h6" stroke="#2f7d47" strokeWidth="1.4" strokeLinecap="round" /></svg>
                <span className="ins-ct">Tipo de Ocorrência</span>
              </div>
            </div>
            <div className="ins-cb">
              <div className="ins-sl">Identificação</div>
              <div className="ins-g">
                <div className="ins-f ins-g2">
                  <label className="ins-l">Código</label>
                  <input className="ins-in" placeholder="Automático" value={form.codigo} onChange={(e) => setField("codigo", e.target.value)} />
                  <span className="ins-fh">Gerado automaticamente.</span>
                </div>
                <div className="ins-f ins-g8">
                  <label className="ins-l">Descrição <span className="ins-lr">*</span></label>
                  <input className="ins-in" placeholder="Ex: Não conformidade de processo" value={form.descricao} onChange={(e) => setField("descricao", e.target.value)} maxLength={200} />
                </div>
                <div className="ins-f ins-g2">
                  <label className="ins-l">Layout</label>
                  <select className="ins-se" value={form.layout} onChange={(e) => setField("layout", e.target.value)}>
                    {LAYOUTS.map((l) => <option key={l} value={l}>{l}</option>)}
                  </select>
                </div>
              </div>

              <div className="ins-sep" />
              <div className="ins-sl">Configurações</div>
              <div className="ins-g">
                <div className="ins-f ins-g3">
                  <label className="ins-l">E-mail</label>
                  <div className="ins-toggle-row">
                    <label className="ins-toggle"><input type="checkbox" checked={form.email} onChange={(e) => setField("email", e.target.checked)} /><div className="ins-toggle-track" /><div className="ins-toggle-thumb" /></label>
                    <span className="ins-toggle-label">{form.email ? "Habilitado" : "Desabilitado"}</span>
                  </div>
                </div>
                <div className="ins-f ins-g3">
                  <label className="ins-l">Não Conformidade</label>
                  <div className="ins-toggle-row">
                    <label className="ins-toggle"><input type="checkbox" checked={form.nao_conformidade} onChange={(e) => setField("nao_conformidade", e.target.checked)} /><div className="ins-toggle-track" /><div className="ins-toggle-thumb" /></label>
                    <span className="ins-toggle-label">{form.nao_conformidade ? "Sim" : "Não"}</span>
                  </div>
                </div>
                <div className="ins-f ins-g3">
                  <label className="ins-l">Disposição</label>
                  <div className="ins-toggle-row">
                    <label className="ins-toggle"><input type="checkbox" checked={form.disposicao} onChange={(e) => setField("disposicao", e.target.checked)} /><div className="ins-toggle-track" /><div className="ins-toggle-thumb" /></label>
                    <span className="ins-toggle-label">{form.disposicao ? "Sim" : "Não"}</span>
                  </div>
                </div>
                <div className="ins-f ins-g3">
                  <label className="ins-l">Causa</label>
                  <div className="ins-toggle-row">
                    <label className="ins-toggle"><input type="checkbox" checked={form.causa} onChange={(e) => setField("causa", e.target.checked)} /><div className="ins-toggle-track" /><div className="ins-toggle-thumb" /></label>
                    <span className="ins-toggle-label">{form.causa ? "Sim" : "Não"}</span>
                  </div>
                </div>
              </div>

              <div className="ins-sep" />
              <div className="ins-sl">Campos Adicionais</div>
              <div className="ins-g">
                <div className="ins-f ins-g3">
                  <label className="ins-l">Ações Corretivas</label>
                  <div className="ins-toggle-row">
                    <label className="ins-toggle"><input type="checkbox" checked={form.acoes_corretivas} onChange={(e) => setField("acoes_corretivas", e.target.checked)} /><div className="ins-toggle-track" /><div className="ins-toggle-thumb" /></label>
                    <span className="ins-toggle-label">{form.acoes_corretivas ? "Sim" : "Não"}</span>
                  </div>
                </div>
                <div className="ins-f ins-g3">
                  <label className="ins-l">Ações Preventivas</label>
                  <div className="ins-toggle-row">
                    <label className="ins-toggle"><input type="checkbox" checked={form.acoes_preventivas} onChange={(e) => setField("acoes_preventivas", e.target.checked)} /><div className="ins-toggle-track" /><div className="ins-toggle-thumb" /></label>
                    <span className="ins-toggle-label">{form.acoes_preventivas ? "Sim" : "Não"}</span>
                  </div>
                </div>
                <div className="ins-f ins-g3">
                  <label className="ins-l">Verificação das Ações</label>
                  <div className="ins-toggle-row">
                    <label className="ins-toggle"><input type="checkbox" checked={form.verificacao_acoes} onChange={(e) => setField("verificacao_acoes", e.target.checked)} /><div className="ins-toggle-track" /><div className="ins-toggle-thumb" /></label>
                    <span className="ins-toggle-label">{form.verificacao_acoes ? "Sim" : "Não"}</span>
                  </div>
                </div>
                <div className="ins-f ins-g3">
                  <label className="ins-l">Fechamento</label>
                  <div className="ins-toggle-row">
                    <label className="ins-toggle"><input type="checkbox" checked={form.fechamento} onChange={(e) => setField("fechamento", e.target.checked)} /><div className="ins-toggle-track" /><div className="ins-toggle-thumb" /></label>
                    <span className="ins-toggle-label">{form.fechamento ? "Sim" : "Não"}</span>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>

        <footer className="ins-ft">
          <div className="ins-ftl">
            <div className="ins-fts">Módulo: <strong>Inspeção</strong></div>
            <div className="ins-fts">Tela: <strong>VINS0105</strong></div>
          </div>
          <div className="ins-fts" style={{gap:8}}><span style={{color:"#a9b6ac",fontSize:11}}>GRUPO VENTURE LTDA</span></div>
        </footer>
      </div>
    </>
  );
}
