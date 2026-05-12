import { useState, useCallback } from "react";
import { type InspecaoFilter } from "@/services/inspecaoService";

type FeedbackState = { type: "success" | "error" | "info"; message: string } | null;

interface InspecaoRow {
  ordem: string;
  data_ordem: string;
  data_inspecao: string;
  fornecedor: string;
  fornecedorNome: string;
  tipo: string;
  classificacao: string;
  itens: string;
  configurado: boolean;
  tipo_roteiro: string;
}

const MOCK_INSPECOES: InspecaoRow[] = [
  { ordem: "OI-2501", data_ordem: "2026-01-15", data_inspecao: "2026-01-20", fornecedor: "001", fornecedorNome: "FORNECEDOR A S.A.", tipo: "MP", classificacao: "CLASSE-A", itens: "I001, I002", configurado: true, tipo_roteiro: "Normal" },
  { ordem: "OI-2502", data_ordem: "2026-02-10", data_inspecao: "2026-02-14", fornecedor: "002", fornecedorNome: "FORNECEDOR B LTDA", tipo: "PA", classificacao: "CLASSE-B", itens: "I003", configurado: false, tipo_roteiro: "Simplificada" },
  { ordem: "OI-2503", data_ordem: "2026-03-05", data_inspecao: "2026-03-09", fornecedor: "001", fornecedorNome: "FORNECEDOR A S.A.", tipo: "MP", classificacao: "CLASSE-A", itens: "I004, I005", configurado: true, tipo_roteiro: "Restrita" },
  { ordem: "OI-2504", data_ordem: "2026-04-01", data_inspecao: "", fornecedor: "003", fornecedorNome: "FORNECEDOR C ME", tipo: "MP", classificacao: "CLASSE-C", itens: "I006", configurado: false, tipo_roteiro: "" },
];

function normalizeError(error: unknown, fallback: string): string {
  if (error && typeof error === "object" && "response" in error) {
    const resp = (error as any).response;
    if (resp?.data?.message) return String(resp.data.message);
  }
  return error instanceof Error ? error.message : fallback;
}

export function Vins0313Page(): JSX.Element {
  const [filtros, setFiltros] = useState<InspecaoFilter>({});
  const [rows, setRows] = useState<InspecaoRow[]>([]);
  const [hasSearch, setHasSearch] = useState(false);
  const [feedback, setFeedback] = useState<FeedbackState>(null);
  const [isSearching, setIsSearching] = useState(false);

  const setFilter = useCallback(<K extends keyof InspecaoFilter>(key: K, value: InspecaoFilter[K]) => {
    setFiltros(p => ({ ...p, [key]: value }));
  }, []);

  async function handlePesquisar() {
    setIsSearching(true); setFeedback(null);
    try { await new Promise(r => setTimeout(r, 800)); setRows(MOCK_INSPECOES); setHasSearch(true); }
    catch (error) { setFeedback({ type: "error", message: normalizeError(error, "Erro na consulta.") }); }
    finally { setIsSearching(false); }
  }

  async function handleGerarExcel() {
    setFeedback(null);
    try {
      await new Promise(r => setTimeout(r, 1000));
      setFeedback({ type: "success", message: "Arquivo Excel gerado com sucesso." });
    } catch (error) {
      setFeedback({ type: "error", message: normalizeError(error, "Erro ao gerar Excel.") });
    }
  }

  function handleLimpar() { setFiltros({}); setRows([]); setHasSearch(false); setFeedback(null); }

  return (
    <>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Inter:wght@300;400;500;600&display=swap');
        *, *::before, *::after { box-sizing: border-box; margin: 0; padding: 0; }

        .ins4-r{min-height:100vh;background:#f0f4ee;font-family:'Inter',sans-serif;color:#1a2e22;display:flex;flex-direction:column}

        .ins4-tb{height:52px;background:#162e20;display:flex;align-items:center;justify-content:space-between;padding:0 20px;flex-shrink:0;border-bottom:1px solid rgba(62,150,84,0.15)}
        .ins4-tbl{display:flex;align-items:center;gap:10px}
        .ins4-lg{width:28px;height:28px;background:#3e9654;border-radius:6px;display:flex;align-items:center;justify-content:center}
        .ins4-an{font-size:13px;font-weight:600;color:#e0f0e3;line-height:1.1}
        .ins4-asb{display:block;font-size:9px;font-weight:400;color:#3d6b4d}
        .ins4-st{font-size:12.5px;font-weight:500;color:#5a9a6a;padding-left:14px;margin-left:14px;border-left:1px solid rgba(255,255,255,0.08)}

        .ins4-ab{background:#fff;border-bottom:1px solid #dbe8d5;padding:0 20px;display:flex;align-items:center;gap:4px;height:46px;flex-shrink:0}
        .ins4-ag{display:flex;align-items:center;gap:4px;padding-right:12px;margin-right:8px;border-right:1px solid #e8f0e4}
        .ins4-ag:last-child{border-right:none}
        .ins4-al{font-size:9.5px;font-weight:600;letter-spacing:0.8px;text-transform:uppercase;color:#96b8a0;margin-right:4px;white-space:nowrap}
        .ins4-bt{display:inline-flex;align-items:center;gap:6px;height:32px;padding:0 12px;border:1.5px solid transparent;border-radius:7px;font-family:'Inter',sans-serif;font-size:12.5px;font-weight:500;cursor:pointer;white-space:nowrap;transition:background 0.13s,border-color 0.13s,color 0.13s}
        .ins4-bt-p{background:#162e20;color:#dff0e2;border-color:#162e20}
        .ins4-bt-p:hover:not(:disabled){background:#1e3a2a}
        .ins4-bt-p:disabled{opacity:0.5;cursor:not-allowed}
        .ins4-bt-g{background:transparent;color:#4a7060;border-color:#d4e8d0}
        .ins4-bt-g:hover:not(:disabled){background:#f0f8ec;border-color:#b0d4b8;color:#1a3828}
        .ins4-bt-g:disabled{opacity:0.5;cursor:not-allowed}
        .ins4-bt-d{background:transparent;color:#b94040;border-color:#f0c8c8}
        .ins4-bt-d:hover:not(:disabled){background:#fff0f0;border-color:#e09090}
        .ins4-bt-x{background:#e8fdf0;color:#156534;border-color:#a0e0b8}
        .ins4-bt-x:hover:not(:disabled){background:#d0f8e0;border-color:#78d098}

        .ins4-by{flex:1;padding:16px 20px;display:flex;flex-direction:column;gap:0;overflow-y:auto}
        .ins4-by::-webkit-scrollbar{width:5px}
        .ins4-by::-webkit-scrollbar-thumb{background:#cce0c8;border-radius:4px}

        .ins4-sb{display:flex;align-items:center;gap:10px;padding:14px 0 8px}
        .ins4-sb:first-child{padding-top:0}
        .ins4-sb-p{font-size:9.5px;font-weight:700;letter-spacing:1.2px;text-transform:uppercase;color:#5a8068;background:#e0ede0;border:1px solid #c8dcc8;border-radius:20px;padding:3px 10px;white-space:nowrap}
        .ins4-sb-l{flex:1;height:1px;background:#dbe8d5}
        .ins4-sb-h{font-size:11px;color:#96b8a0;white-space:nowrap}

        .ins4-c{background:#fff;border:1px solid #dbe8d5;border-radius:12px;overflow:hidden;margin-bottom:14px}
        .ins4-ch{display:flex;align-items:center;justify-content:space-between;padding:12px 18px;border-bottom:1px solid #edf5e8;background:#fafcf9}
        .ins4-chl{display:flex;align-items:center;gap:8px}
        .ins4-ct{font-size:12px;font-weight:600;color:#2a4a35;text-transform:uppercase;letter-spacing:0.6px}
        .ins4-cbg{font-size:10.5px;font-weight:500;color:#3e9654;background:#eef5ea;border:1px solid #c4dfc8;border-radius:12px;padding:2px 8px}
        .ins4-cb{padding:18px 18px}

        .ins4-fr{display:flex;align-items:flex-end;gap:12px;flex-wrap:wrap}
        .ins4-f{display:flex;flex-direction:column;gap:5px}
        .ins4-l{font-size:10.5px;font-weight:600;color:#5a8068;text-transform:uppercase;letter-spacing:0.4px;display:flex;align-items:center;gap:4px}
        .ins4-in{width:100%;height:36px;background:#f8fbf6;border:1.5px solid #d4e8cc;border-radius:7px;padding:0 10px;font-family:'Inter',sans-serif;font-size:13px;color:#1a2e22;outline:none;transition:border-color 0.13s,box-shadow 0.13s}
        .ins4-in:focus{border-color:#3e9654;box-shadow:0 0 0 2px rgba(62,150,84,0.1)}
        .ins4-in::placeholder{color:#b0c8b8;font-size:12px}
        .ins4-in[type="date"]{cursor:pointer}
        .ins4-se{width:100%;height:36px;background:#f8fbf6;border:1.5px solid #d4e8cc;border-radius:7px;padding:0 28px 0 10px;font-family:'Inter',sans-serif;font-size:13px;color:#1a2e22;outline:none;appearance:none;cursor:pointer;background-image:url("data:image/svg+xml,%3Csvg width='10' height='6' viewBox='0 0 10 6' xmlns='http://www.w3.org/2000/svg'%3E%3Cpath d='M1 1l4 4 4-4' stroke='%23789a84' stroke-width='1.5' fill='none' stroke-linecap='round' stroke-linejoin='round'/%3E%3C/svg%3E");background-repeat:no-repeat;background-position:right 10px center;transition:border-color 0.13s}
        .ins4-se:focus{border-color:#3e9654;box-shadow:0 0 0 2px rgba(62,150,84,0.1)}
        .ins4-fh{font-size:11px;color:#7a9c84;margin-top:2px;line-height:1.45}

        .ins4-toggle-row{display:flex;align-items:center;gap:10px;padding-top:10px}
        .ins4-toggle{position:relative;width:38px;height:20px;flex-shrink:0;cursor:pointer}
        .ins4-toggle input{opacity:0;width:0;height:0;position:absolute}
        .ins4-toggle-track{position:absolute;inset:0;background:#d4e0d0;border-radius:20px;transition:background 0.2s}
        .ins4-toggle input:checked~.ins4-toggle-track{background:#3e9654}
        .ins4-toggle-thumb{position:absolute;top:3px;left:3px;width:14px;height:14px;background:#fff;border-radius:50%;transition:transform 0.2s;box-shadow:0 1px 3px rgba(0,0,0,0.15)}
        .ins4-toggle input:checked~.ins4-toggle-thumb{transform:translateX(18px)}
        .ins4-toggle-label{font-size:13px;color:#3a5a45;font-weight:500}

        .ins4-rw{border-top:1px solid #edf5e8;overflow-x:auto}
        .ins4-rb{display:flex;align-items:center;justify-content:space-between;padding:10px 18px;background:#f4f9f2;border-bottom:1px solid #e8f0e4}
        .ins4-rbl{display:flex;align-items:center;gap:8px}
        .ins4-rbl-l{font-size:11px;font-weight:600;color:#4a7060;text-transform:uppercase;letter-spacing:0.5px}
        .ins4-rt{width:100%;border-collapse:collapse;font-size:13px}
        .ins4-rt th{background:#f4f9f2;padding:8px 12px;text-align:left;font-size:10.5px;font-weight:700;color:#5a8068;text-transform:uppercase;letter-spacing:0.5px;border-bottom:1.5px solid #dbe8d5;white-space:nowrap}
        .ins4-rt td{padding:9px 12px;border-bottom:1px solid #f0f6ec;color:#243830;vertical-align:middle}
        .ins4-rt tbody tr{cursor:pointer;transition:background 0.1s}
        .ins4-rt tbody tr:hover{background:#eef9f0}
        .ins4-rem{text-align:center;padding:28px 12px;color:#96b8a0;font-size:12.5px}

        .ins4-fb{display:flex;align-items:center;gap:9px;padding:11px 15px;border-radius:9px;font-size:13px;animation:ins4FdIn 0.2s ease;margin-bottom:14px}
        .ins4-fb.s{background:#f0faf2;border:1px solid #b4dec0;color:#1e6030}
        .ins4-fb.e{background:#fff5f5;border:1px solid #f8c0c0;border-left:3px solid #e05252;color:#b91c1c}
        .ins4-fb.i{background:#f0f8ff;border:1px solid #c7def8;border-left:3px solid #4a90d9;color:#1a4070}

        .ins4-ft{background:#fff;border-top:1px solid #dbe8d5;padding:8px 20px;display:flex;align-items:center;justify-content:space-between;flex-shrink:0}
        .ins4-ftl{display:flex;align-items:center;gap:20px}
        .ins4-fts{display:flex;align-items:center;gap:6px;font-size:11.5px;color:#6a8a74}
        .ins4-fts strong{color:#1a2e22;font-weight:600}

        @keyframes ins4Spin{to{transform:rotate(360deg)}}
        .ins4-sp{width:14px;height:14px;flex-shrink:0;border:2px solid rgba(223,240,226,0.3);border-top-color:#dff0e2;border-radius:50%;animation:ins4Spin 0.65s linear infinite}
        .ins4-spd{width:14px;height:14px;flex-shrink:0;border:2px solid #d4e8cc;border-top-color:#3e9654;border-radius:50%;animation:ins4Spin 0.65s linear infinite}
        @keyframes ins4FdIn{from{opacity:0;transform:translateY(-4px)}to{opacity:1;transform:translateY(0)}}
      `}</style>

      <div className="ins4-r">
        <header className="ins4-tb">
          <div className="ins4-tbl">
            <div className="ins4-lg">
              <svg width="15" height="15" viewBox="0 0 18 18" fill="none">
                <rect x="1.5" y="1.5" width="6" height="6" rx="1.2" fill="rgba(255,255,255,0.9)" />
                <rect x="10.5" y="1.5" width="6" height="6" rx="1.2" fill="rgba(255,255,255,0.4)" />
                <rect x="1.5" y="10.5" width="6" height="6" rx="1.2" fill="rgba(255,255,255,0.4)" />
                <rect x="10.5" y="10.5" width="6" height="6" rx="1.2" fill="rgba(255,255,255,0.7)" />
              </svg>
            </div>
            <span className="ins4-an">Venture<span className="ins4-asb">ERP &amp; Soluções</span></span>
            <span className="ins4-st">VINS0313 — Consulta de Inspeções de Recebimento</span>
          </div>
        </header>

        <div className="ins4-ab">
          <div className="ins4-ag">
            <span className="ins4-al">Operação</span>
            <button className="ins4-bt ins4-bt-x" onClick={() => void handleGerarExcel()}>
              <svg width="13" height="13" viewBox="0 0 16 16" fill="none"><rect x="2" y="1" width="12" height="14" rx="1.5" stroke="currentColor" strokeWidth="1.3" /><path d="M5 6h6M5 9h6M5 12h4" stroke="currentColor" strokeWidth="1.3" strokeLinecap="round" /></svg>
              Gerar Excel
            </button>
          </div>
          <div className="ins4-ag">
            <span className="ins4-al">Ações</span>
            <button className="ins4-bt ins4-bt-d" onClick={handleLimpar}>
              <svg width="13" height="13" viewBox="0 0 16 16" fill="none"><path d="M3 3l10 10M13 3L3 13" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" /></svg>Limpar
            </button>
          </div>
          <div className="ins4-ag">
            <button className="ins4-bt ins4-bt-g">
              <svg width="13" height="13" viewBox="0 0 16 16" fill="none"><circle cx="8" cy="8" r="6" stroke="currentColor" strokeWidth="1.4" /><path d="M8 7v4M8 5.5h.01" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" /></svg>Ajuda
            </button>
          </div>
        </div>

        <div className="ins4-by">
          {feedback && (
            <div className={`ins4-fb ${feedback.type === "success" ? "s" : feedback.type === "error" ? "e" : "i"}`}>
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

          <div className="ins4-sb">
            <span className="ins4-sb-p">1 — Filtrar</span>
            <div className="ins4-sb-l" />
            <span className="ins4-sb-h">Preencha os filtros e clique em Pesquisar</span>
          </div>

          <div className="ins4-c">
            <div className="ins4-ch">
              <div className="ins4-chl">
                <svg width="14" height="14" viewBox="0 0 16 16" fill="none"><circle cx="6.5" cy="6.5" r="4.5" stroke="#3e9654" strokeWidth="1.4" /><path d="M10 10l3.5 3.5" stroke="#3e9654" strokeWidth="1.4" strokeLinecap="round" /></svg>
                <span className="ins4-ct">Filtros</span>
              </div>
            </div>
            <div className="ins4-cb" style={{paddingBottom:14}}>
              <div className="ins4-fr">
                <div className="ins4-f" style={{flex:"0 0 180px"}}>
                  <label className="ins4-l">Data Ordem Início</label>
                  <input type="date" className="ins4-in" value={filtros.data_ordem_inicio || ""} onChange={e => setFilter("data_ordem_inicio", e.target.value)} />
                </div>
                <div className="ins4-f" style={{flex:"0 0 180px"}}>
                  <label className="ins4-l">Data Ordem Fim</label>
                  <input type="date" className="ins4-in" value={filtros.data_ordem_fim || ""} onChange={e => setFilter("data_ordem_fim", e.target.value)} />
                </div>
                <div className="ins4-f" style={{flex:"0 0 180px"}}>
                  <label className="ins4-l">Data Inspeção Início</label>
                  <input type="date" className="ins4-in" value={filtros.data_inspecao_inicio || ""} onChange={e => setFilter("data_inspecao_inicio", e.target.value)} />
                </div>
                <div className="ins4-f" style={{flex:"0 0 180px"}}>
                  <label className="ins4-l">Data Inspeção Fim</label>
                  <input type="date" className="ins4-in" value={filtros.data_inspecao_fim || ""} onChange={e => setFilter("data_inspecao_fim", e.target.value)} />
                </div>
              </div>
              <div className="ins4-fr" style={{marginTop:12}}>
                <div className="ins4-f" style={{flex:"0 0 220px"}}>
                  <label className="ins4-l">Fornecedor</label>
                  <input className="ins4-in" placeholder="Código ou nome" value={filtros.fornecedor || ""} onChange={e => setFilter("fornecedor", e.target.value)} />
                </div>
                <div className="ins4-f" style={{flex:"0 0 150px"}}>
                  <label className="ins4-l">Tipo</label>
                  <input className="ins4-in" placeholder="Ex: MP" value={filtros.tipo || ""} onChange={e => setFilter("tipo", e.target.value)} />
                </div>
                <div className="ins4-f" style={{flex:"0 0 160px"}}>
                  <label className="ins4-l">Class. Itens</label>
                  <input className="ins4-in" placeholder="Ex: CLASSE-A" value={filtros.classificacao || ""} onChange={e => setFilter("classificacao", e.target.value)} />
                </div>
                <div className="ins4-f" style={{flex:"0 0 150px"}}>
                  <label className="ins4-l">Itens</label>
                  <input className="ins4-in" placeholder="Ex: I001" value={filtros.itens || ""} onChange={e => setFilter("itens", e.target.value)} />
                </div>
              </div>
              <div className="ins4-fr" style={{marginTop:12}}>
                <div className="ins4-f" style={{flex:"0 0 160px"}}>
                  <label className="ins4-l">Ordem Insp.</label>
                  <input className="ins4-in" placeholder="Ex: OI-2501" value={filtros.ordem || ""} onChange={e => setFilter("ordem", e.target.value)} />
                </div>
                <div className="ins4-f" style={{flex:"0 0 160px"}}>
                  <label className="ins4-l">Tp. Rot. Inspeção</label>
                  <input className="ins4-in" placeholder="Código" value={filtros.tipo_roteiro || ""} onChange={e => setFilter("tipo_roteiro", e.target.value)} />
                </div>
                <div className="ins4-f" style={{alignSelf:"flex-end", paddingTop:18}}>
                  <div className="ins4-toggle-row">
                    <label className="ins4-toggle"><input type="checkbox" checked={!!filtros.configurado} onChange={e => setFilter("configurado", e.target.checked)} /><div className="ins4-toggle-track" /><div className="ins4-toggle-thumb" /></label>
                    <span className="ins4-toggle-label">Configurado</span>
                  </div>
                </div>
                <div style={{alignSelf:"flex-end"}}>
                  <button className="ins4-bt ins4-bt-g" onClick={() => void handlePesquisar()} disabled={isSearching}>
                    {isSearching ? <><div className="ins4-spd" />Buscando...</> : <><svg width="13" height="13" viewBox="0 0 16 16" fill="none"><circle cx="6.5" cy="6.5" r="4.5" stroke="currentColor" strokeWidth="1.4" /><path d="M10 10l3.5 3.5" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" /></svg>Pesquisar</>}
                  </button>
                </div>
              </div>
            </div>
          </div>

          {hasSearch && (
            <>
              <div className="ins4-sb">
                <span className="ins4-sb-p">2 — Resultados</span>
                <div className="ins4-sb-l" />
                <span className="ins4-sb-h">{rows.length} inspeção(ões)</span>
              </div>
              <div className="ins4-c">
                <div className="ins4-rw">
                  <div className="ins4-rb">
                    <div className="ins4-rbl">
                      <svg width="13" height="13" viewBox="0 0 16 16" fill="none"><path d="M2 4h12M2 8h12M2 12h8" stroke="#5a8068" strokeWidth="1.4" strokeLinecap="round" /></svg>
                      <span className="ins4-rbl-l">Inspeções de Recebimento</span>
                      <span className="ins4-cbg">{rows.length} registro(s)</span>
                    </div>
                  </div>
                  <table className="ins4-rt">
                    <thead>
                      <tr>
                        <th style={{width:130}}>Ordem</th><th style={{width:130}}>Data Ordem</th><th style={{width:130}}>Data Insp.</th><th>Fornecedor</th>
                        <th style={{width:80}}>Tipo</th><th style={{width:120}}>Class. Itens</th><th>Itens</th>
                        <th style={{width:100}}>Config.</th><th style={{width:130}}>Tp. Rot.</th>
                      </tr>
                    </thead>
                    <tbody>
                      {rows.map(r => (
                        <tr key={r.ordem}>
                          <td style={{fontWeight:600,color:"#1a4a2a"}}>{r.ordem}</td>
                          <td>{r.data_ordem ? new Date(r.data_ordem + "T00:00:00").toLocaleDateString("pt-BR") : "—"}</td>
                          <td>{r.data_inspecao ? new Date(r.data_inspecao + "T00:00:00").toLocaleDateString("pt-BR") : "—"}</td>
                          <td>{r.fornecedorNome}</td>
                          <td>{r.tipo}</td><td>{r.classificacao}</td><td>{r.itens}</td>
                          <td>{r.configurado ? <span style={{color:"#2a8040",fontWeight:600}}>Sim</span> : <span style={{color:"#96b8a0"}}>Não</span>}</td>
                          <td>{r.tipo_roteiro || "—"}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            </>
          )}
        </div>

        <footer className="ins4-ft">
          <div className="ins4-ftl">
            <div className="ins4-fts">Registros: <strong>{rows.length}</strong></div>
            <div className="ins4-fts">Módulo: <strong>Inspeção</strong></div>
          </div>
          <div className="ins4-fts" style={{gap:8}}><span style={{color:"#b0c8b8",fontSize:11}}>GRUPO VENTURE LTDA</span></div>
        </footer>
      </div>
    </>
  );
}
