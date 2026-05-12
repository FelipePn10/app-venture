import { useState, useCallback } from "react";
import { type EnvioIQF_DTO } from "@/services/inspecaoService";

type FeedbackState = { type: "success" | "error" | "info"; message: string } | null;

interface IQFRow {
  empresa: string;
  fornecedor: string;
  fornecedorNome: string;
  iqf: number;
  parecer: string;
  classificacao: string;
  layout: string;
}

const MOCK_IQF: IQFRow[] = [
  { empresa: "001", fornecedor: "001", fornecedorNome: "FORNECEDOR A S.A.", iqf: 87.5, parecer: "Qualificado", classificacao: "A", layout: "Padrão" },
  { empresa: "001", fornecedor: "002", fornecedorNome: "FORNECEDOR B LTDA", iqf: 72.3, parecer: "Regular", classificacao: "B", layout: "Padrão" },
  { empresa: "001", fornecedor: "003", fornecedorNome: "FORNECEDOR C ME", iqf: 45.0, parecer: "Não Qualificado", classificacao: "C", layout: "Simplificado" },
  { empresa: "002", fornecedor: "001", fornecedorNome: "FORNECEDOR A S.A.", iqf: 91.2, parecer: "Qualificado", classificacao: "A", layout: "Padrão" },
];

const TIPOS = ["", "Código", "Descrição"];

function normalizeError(error: unknown, fallback: string): string {
  if (error && typeof error === "object" && "response" in error) {
    const resp = (error as any).response;
    if (resp?.data?.message) return String(resp.data.message);
  }
  return error instanceof Error ? error.message : fallback;
}

export function Vavf0204Page(): JSX.Element {
  const [filtros, setFiltros] = useState<EnvioIQF_DTO>({ fornecedor: "", tipo: "", periodo_inicio: "", periodo_fim: "" });
  const [rows, setRows] = useState<IQFRow[]>([]);
  const [hasCalculado, setHasCalculado] = useState(false);
  const [feedback, setFeedback] = useState<FeedbackState>(null);
  const [isCalculating, setIsCalculating] = useState(false);

  const setFilter = useCallback(<K extends keyof EnvioIQF_DTO>(key: K, value: EnvioIQF_DTO[K]) => {
    setFiltros(p => ({ ...p, [key]: value }));
  }, []);

  async function handleCalcularIQF() {
    setIsCalculating(true); setFeedback(null);
    try {
      await new Promise(r => setTimeout(r, 1200));
      setRows(MOCK_IQF);
      setHasCalculado(true);
      setFeedback({ type: "success", message: `IQF calculado para ${MOCK_IQF.length} fornecedor(es).` });
    } catch (error) { setFeedback({ type: "error", message: normalizeError(error, "Erro ao calcular IQF.") }); }
    finally { setIsCalculating(false); }
  }

  async function handleEnviarEmail() {
    setFeedback(null);
    try {
      await new Promise(r => setTimeout(r, 800));
      setFeedback({ type: "success", message: "E-mails enviados com sucesso aos fornecedores." });
    } catch (error) { setFeedback({ type: "error", message: normalizeError(error, "Erro ao enviar e-mails.") }); }
  }

  function handleLimpar() { setFiltros({ fornecedor: "", tipo: "", periodo_inicio: "", periodo_fim: "" }); setRows([]); setHasCalculado(false); setFeedback(null); }

  const getClassificacaoColor = (c: string) => c === "A" ? "#2a8040" : c === "B" ? "#7a5200" : "#b94040";

  return (
    <>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Inter:wght@300;400;500;600&display=swap');
        *, *::before, *::after { box-sizing: border-box; margin: 0; padding: 0; }

        .avf3-r{min-height:100vh;background:#f0f4ee;font-family:'Inter',sans-serif;color:#1a2e22;display:flex;flex-direction:column}

        .avf3-tb{height:52px;background:#162e20;display:flex;align-items:center;justify-content:space-between;padding:0 20px;flex-shrink:0;border-bottom:1px solid rgba(62,150,84,0.15)}
        .avf3-tbl{display:flex;align-items:center;gap:10px}
        .avf3-lg{width:28px;height:28px;background:#3e9654;border-radius:6px;display:flex;align-items:center;justify-content:center}
        .avf3-an{font-size:13px;font-weight:600;color:#e0f0e3;line-height:1.1}
        .avf3-asb{display:block;font-size:9px;font-weight:400;color:#3d6b4d}
        .avf3-st{font-size:12.5px;font-weight:500;color:#5a9a6a;padding-left:14px;margin-left:14px;border-left:1px solid rgba(255,255,255,0.08)}

        .avf3-ab{background:#fff;border-bottom:1px solid #dbe8d5;padding:0 20px;display:flex;align-items:center;gap:4px;height:46px;flex-shrink:0}
        .avf3-ag{display:flex;align-items:center;gap:4px;padding-right:12px;margin-right:8px;border-right:1px solid #e8f0e4}
        .avf3-ag:last-child{border-right:none}
        .avf3-al{font-size:9.5px;font-weight:600;letter-spacing:0.8px;text-transform:uppercase;color:#96b8a0;margin-right:4px;white-space:nowrap}
        .avf3-bt{display:inline-flex;align-items:center;gap:6px;height:32px;padding:0 12px;border:1.5px solid transparent;border-radius:7px;font-family:'Inter',sans-serif;font-size:12.5px;font-weight:500;cursor:pointer;white-space:nowrap;transition:background 0.13s,border-color 0.13s,color 0.13s}
        .avf3-bt-p{background:#162e20;color:#dff0e2;border-color:#162e20}
        .avf3-bt-p:hover:not(:disabled){background:#1e3a2a}
        .avf3-bt-p:disabled{opacity:0.5;cursor:not-allowed}
        .avf3-bt-g{background:transparent;color:#4a7060;border-color:#d4e8d0}
        .avf3-bt-g:hover:not(:disabled){background:#f0f8ec;border-color:#b0d4b8;color:#1a3828}
        .avf3-bt-g:disabled{opacity:0.5;cursor:not-allowed}
        .avf3-bt-d{background:transparent;color:#b94040;border-color:#f0c8c8}
        .avf3-bt-d:hover:not(:disabled){background:#fff0f0;border-color:#e09090}
        .avf3-bt-c{background:#e8f8f0;color:#17663a;border-color:#a0e0b8}
        .avf3-bt-c:hover:not(:disabled){background:#d0f4e0;border-color:#78d098}

        .avf3-by{flex:1;padding:16px 20px;display:flex;flex-direction:column;gap:0;overflow-y:auto}
        .avf3-by::-webkit-scrollbar{width:5px}
        .avf3-by::-webkit-scrollbar-thumb{background:#cce0c8;border-radius:4px}

        .avf3-sb{display:flex;align-items:center;gap:10px;padding:14px 0 8px}
        .avf3-sb:first-child{padding-top:0}
        .avf3-sb-p{font-size:9.5px;font-weight:700;letter-spacing:1.2px;text-transform:uppercase;color:#5a8068;background:#e0ede0;border:1px solid #c8dcc8;border-radius:20px;padding:3px 10px;white-space:nowrap}
        .avf3-sb-l{flex:1;height:1px;background:#dbe8d5}
        .avf3-sb-h{font-size:11px;color:#96b8a0;white-space:nowrap}

        .avf3-c{background:#fff;border:1px solid #dbe8d5;border-radius:12px;overflow:hidden;margin-bottom:14px}
        .avf3-ch{display:flex;align-items:center;justify-content:space-between;padding:12px 18px;border-bottom:1px solid #edf5e8;background:#fafcf9}
        .avf3-chl{display:flex;align-items:center;gap:8px}
        .avf3-ct{font-size:12px;font-weight:600;color:#2a4a35;text-transform:uppercase;letter-spacing:0.6px}
        .avf3-cbg{font-size:10.5px;font-weight:500;color:#3e9654;background:#eef5ea;border:1px solid #c4dfc8;border-radius:12px;padding:2px 8px}
        .avf3-cb{padding:18px 18px}

        .avf3-fr{display:flex;align-items:flex-end;gap:12px;flex-wrap:wrap}
        .avf3-f{display:flex;flex-direction:column;gap:5px}
        .avf3-l{font-size:10.5px;font-weight:600;color:#5a8068;text-transform:uppercase;letter-spacing:0.4px;display:flex;align-items:center;gap:4px}
        .avf3-lr{color:#c84040;font-size:12px;line-height:1}
        .avf3-in{width:100%;height:36px;background:#f8fbf6;border:1.5px solid #d4e8cc;border-radius:7px;padding:0 10px;font-family:'Inter',sans-serif;font-size:13px;color:#1a2e22;outline:none;transition:border-color 0.13s,box-shadow 0.13s}
        .avf3-in:focus{border-color:#3e9654;box-shadow:0 0 0 2px rgba(62,150,84,0.1)}
        .avf3-in::placeholder{color:#b0c8b8;font-size:12px}
        .avf3-in[type="date"]{cursor:pointer}
        .avf3-se{width:100%;height:36px;background:#f8fbf6;border:1.5px solid #d4e8cc;border-radius:7px;padding:0 28px 0 10px;font-family:'Inter',sans-serif;font-size:13px;color:#1a2e22;outline:none;appearance:none;cursor:pointer;background-image:url("data:image/svg+xml,%3Csvg width='10' height='6' viewBox='0 0 10 6' xmlns='http://www.w3.org/2000/svg'%3E%3Cpath d='M1 1l4 4 4-4' stroke='%23789a84' stroke-width='1.5' fill='none' stroke-linecap='round' stroke-linejoin='round'/%3E%3C/svg%3E");background-repeat:no-repeat;background-position:right 10px center;transition:border-color 0.13s}
        .avf3-se:focus{border-color:#3e9654;box-shadow:0 0 0 2px rgba(62,150,84,0.1)}

        .avf3-rw{border-top:1px solid #edf5e8;overflow-x:auto}
        .avf3-rb{display:flex;align-items:center;justify-content:space-between;padding:10px 18px;background:#f4f9f2;border-bottom:1px solid #e8f0e4}
        .avf3-rbl{display:flex;align-items:center;gap:8px}
        .avf3-rbl-l{font-size:11px;font-weight:600;color:#4a7060;text-transform:uppercase;letter-spacing:0.5px}
        .avf3-rt{width:100%;border-collapse:collapse;font-size:13px}
        .avf3-rt th{background:#f4f9f2;padding:8px 12px;text-align:left;font-size:10.5px;font-weight:700;color:#5a8068;text-transform:uppercase;letter-spacing:0.5px;border-bottom:1.5px solid #dbe8d5;white-space:nowrap}
        .avf3-rt td{padding:9px 12px;border-bottom:1px solid #f0f6ec;color:#243830;vertical-align:middle}
        .avf3-rt tbody tr:hover{background:#eef9f0}
        .avf3-rem{text-align:center;padding:28px 12px;color:#96b8a0;font-size:12.5px}

        .avf3-fb{display:flex;align-items:center;gap:9px;padding:11px 15px;border-radius:9px;font-size:13px;animation:avf3FdIn 0.2s ease;margin-bottom:14px}
        .avf3-fb.s{background:#f0faf2;border:1px solid #b4dec0;color:#1e6030}
        .avf3-fb.e{background:#fff5f5;border:1px solid #f8c0c0;border-left:3px solid #e05252;color:#b91c1c}
        .avf3-fb.i{background:#f0f8ff;border:1px solid #c7def8;border-left:3px solid #4a90d9;color:#1a4070}

        .avf3-ft{background:#fff;border-top:1px solid #dbe8d5;padding:8px 20px;display:flex;align-items:center;justify-content:space-between;flex-shrink:0}
        .avf3-ftl{display:flex;align-items:center;gap:20px}
        .avf3-fts{display:flex;align-items:center;gap:6px;font-size:11.5px;color:#6a8a74}
        .avf3-fts strong{color:#1a2e22;font-weight:600}

        .avf3-iqf-bar{display:flex;align-items:center;gap:8px}
        .avf3-iqf-bar-bg{width:80px;height:6px;background:#e0ead8;border-radius:3px;overflow:hidden}
        .avf3-iqf-bar-fill{height:100%;border-radius:3px;transition:width 0.3s}

        @keyframes avf3Spin{to{transform:rotate(360deg)}}
        .avf3-sp{width:14px;height:14px;flex-shrink:0;border:2px solid rgba(223,240,226,0.3);border-top-color:#dff0e2;border-radius:50%;animation:avf3Spin 0.65s linear infinite}
        .avf3-spd{width:14px;height:14px;flex-shrink:0;border:2px solid #d4e8cc;border-top-color:#3e9654;border-radius:50%;animation:avf3Spin 0.65s linear infinite}
        @keyframes avf3FdIn{from{opacity:0;transform:translateY(-4px)}to{opacity:1;transform:translateY(0)}}
      `}</style>

      <div className="avf3-r">
        <header className="avf3-tb">
          <div className="avf3-tbl">
            <div className="avf3-lg">
              <svg width="15" height="15" viewBox="0 0 18 18" fill="none">
                <rect x="1.5" y="1.5" width="6" height="6" rx="1.2" fill="rgba(255,255,255,0.9)" />
                <rect x="10.5" y="1.5" width="6" height="6" rx="1.2" fill="rgba(255,255,255,0.4)" />
                <rect x="1.5" y="10.5" width="6" height="6" rx="1.2" fill="rgba(255,255,255,0.4)" />
                <rect x="10.5" y="10.5" width="6" height="6" rx="1.2" fill="rgba(255,255,255,0.7)" />
              </svg>
            </div>
            <span className="avf3-an">Venture<span className="avf3-asb">ERP &amp; Soluções</span></span>
            <span className="avf3-st">VAVF0204 — Envio de IQF aos Fornecedores</span>
          </div>
        </header>

        <div className="avf3-ab">
          <div className="avf3-ag">
            <span className="avf3-al">Operação</span>
            <button className="avf3-bt avf3-bt-c" onClick={() => void handleCalcularIQF()} disabled={isCalculating}>
              {isCalculating ? <><div className="avf3-spd" />Calculando...</> : <><svg width="13" height="13" viewBox="0 0 16 16" fill="none"><circle cx="8" cy="8" r="6" stroke="currentColor" strokeWidth="1.4" /><path d="M8 4v4l3 2" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" /></svg>Calcular IQF</>}
            </button>
          </div>
          <div className="avf3-ag">
            <span className="avf3-al">Ações</span>
            {hasCalculado && (
              <button className="avf3-bt avf3-bt-p" onClick={() => void handleEnviarEmail()}>
                <svg width="13" height="13" viewBox="0 0 16 16" fill="none"><rect x="1.5" y="3" width="13" height="10" rx="1.5" stroke="currentColor" strokeWidth="1.3" /><path d="M1.5 4l6 4 6-4" stroke="currentColor" strokeWidth="1.3" strokeLinecap="round" strokeLinejoin="round" /></svg>
                Enviar E-mail
              </button>
            )}
            <button className="avf3-bt avf3-bt-d" onClick={handleLimpar}>
              <svg width="13" height="13" viewBox="0 0 16 16" fill="none"><path d="M3 3l10 10M13 3L3 13" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" /></svg>Limpar
            </button>
          </div>
          <div className="avf3-ag">
            <button className="avf3-bt avf3-bt-g">
              <svg width="13" height="13" viewBox="0 0 16 16" fill="none"><circle cx="8" cy="8" r="6" stroke="currentColor" strokeWidth="1.4" /><path d="M8 7v4M8 5.5h.01" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" /></svg>Ajuda
            </button>
          </div>
        </div>

        <div className="avf3-by">
          {feedback && (
            <div className={`avf3-fb ${feedback.type === "success" ? "s" : feedback.type === "error" ? "e" : "i"}`}>
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

          <div className="avf3-sb">
            <span className="avf3-sb-p">1 — Filtrar</span>
            <div className="avf3-sb-l" />
            <span className="avf3-sb-h">Preencha os filtros e clique em Calcular IQF</span>
          </div>

          <div className="avf3-c">
            <div className="avf3-ch">
              <div className="avf3-chl">
                <svg width="14" height="14" viewBox="0 0 16 16" fill="none"><circle cx="6.5" cy="6.5" r="4.5" stroke="#3e9654" strokeWidth="1.4" /><path d="M10 10l3.5 3.5" stroke="#3e9654" strokeWidth="1.4" strokeLinecap="round" /></svg>
                <span className="avf3-ct">Filtros</span>
              </div>
            </div>
            <div className="avf3-cb" style={{paddingBottom:14}}>
              <div className="avf3-fr">
                <div className="avf3-f" style={{flex:"0 0 220px"}}>
                  <label className="avf3-l">Fornecedor</label>
                  <input className="avf3-in" placeholder="Código ou nome" value={filtros.fornecedor} onChange={e => setFilter("fornecedor", e.target.value)} />
                </div>
                <div className="avf3-f" style={{flex:"0 0 180px"}}>
                  <label className="avf3-l">Tipo</label>
                  <select className="avf3-se" value={filtros.tipo} onChange={e => setFilter("tipo", e.target.value)}>
                    {TIPOS.map(t => <option key={t} value={t}>{t || "Selecione..."}</option>)}
                  </select>
                </div>
                <div className="avf3-f" style={{flex:"0 0 180px"}}>
                  <label className="avf3-l">Período Início</label>
                  <input type="date" className="avf3-in" value={filtros.periodo_inicio} onChange={e => setFilter("periodo_inicio", e.target.value)} />
                </div>
                <div className="avf3-f" style={{flex:"0 0 180px"}}>
                  <label className="avf3-l">Período Fim</label>
                  <input type="date" className="avf3-in" value={filtros.periodo_fim} onChange={e => setFilter("periodo_fim", e.target.value)} />
                </div>
              </div>
            </div>
          </div>

          {hasCalculado && rows.length > 0 && (
            <>
              <div className="avf3-sb">
                <span className="avf3-sb-p">2 — Resultados</span>
                <div className="avf3-sb-l" />
                <span className="avf3-sb-h">{rows.length} fornecedor(es)</span>
              </div>
              <div className="avf3-c">
                <div className="avf3-rw">
                  <div className="avf3-rb">
                    <div className="avf3-rbl">
                      <svg width="13" height="13" viewBox="0 0 16 16" fill="none"><path d="M2 4h12M2 8h12M2 12h8" stroke="#5a8068" strokeWidth="1.4" strokeLinecap="round" /></svg>
                      <span className="avf3-rbl-l">IQF Calculado</span>
                      <span className="avf3-cbg">{rows.length} registro(s)</span>
                    </div>
                  </div>
                  <table className="avf3-rt">
                    <thead>
                      <tr>
                        <th style={{width:100}}>Emp.</th><th>Forn.</th><th style={{width:160}}>IQF</th>
                        <th style={{width:160}}>Parecer</th><th style={{width:140}}>Classificação</th><th style={{width:140}}>Layout</th>
                      </tr>
                    </thead>
                    <tbody>
                      {rows.map((r, i) => (
                        <tr key={i}>
                          <td style={{fontWeight:600,color:"#1a4a2a"}}>{r.empresa}</td>
                          <td>{r.fornecedorNome}</td>
                          <td>
                            <div className="avf3-iqf-bar">
                              <div className="avf3-iqf-bar-bg">
                                <div className="avf3-iqf-bar-fill" style={{
                                  width: `${r.iqf}%`,
                                  background: r.iqf >= 70 ? '#3e9654' : r.iqf >= 50 ? '#c8a020' : '#e05252'
                                }} />
                              </div>
                              <span style={{fontWeight:600,fontSize:12}}>{r.iqf.toFixed(1)}%</span>
                            </div>
                          </td>
                          <td>{r.parecer}</td>
                          <td style={{fontWeight:600,color:getClassificacaoColor(r.classificacao)}}>{r.classificacao}</td>
                          <td>{r.layout}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            </>
          )}
        </div>

        <footer className="avf3-ft">
          <div className="avf3-ftl">
            <div className="avf3-fts">Registros: <strong>{rows.length}</strong></div>
            <div className="avf3-fts">Módulo: <strong>Inspeção</strong></div>
          </div>
          <div className="avf3-fts" style={{gap:8}}><span style={{color:"#b0c8b8",fontSize:11}}>GRUPO VENTURE LTDA</span></div>
        </footer>
      </div>
    </>
  );
}
