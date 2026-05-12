import { useState, useCallback } from "react";
import { type OrdemInspecaoFilter } from "@/services/inspecaoService";

type FeedbackState = { type: "success" | "error" | "info"; message: string } | null;

interface OrdemRow {
  ordem: string;
  sequencia: number;
  nro_nota: string;
  nro_aviso: string;
  data_entrada: string;
  item: string;
  quantidade: number;
  descricao: string;
  status: string;
}

const STATUS_OPTIONS = [
  { value: "", label: "Todas" },
  { value: "PEND_INSP", label: "Pendentes inspeção" },
  { value: "PEND_ANAL", label: "Pendentes análise" },
  { value: "SKIP", label: "Inspeção SKIP" },
];

const MOCK_ORDENS: OrdemRow[] = [
  { ordem: "OI-2501", sequencia: 1, nro_nota: "NF-1001", nro_aviso: "AV-2001", data_entrada: "2026-01-15", item: "I001", quantidade: 500, descricao: "Rolamento 6205-2RS", status: "PEND_INSP" },
  { ordem: "OI-2501", sequencia: 2, nro_nota: "NF-1001", nro_aviso: "AV-2001", data_entrada: "2026-01-15", item: "I002", quantidade: 1200, descricao: "Retentor 45x62x7", status: "PEND_INSP" },
  { ordem: "OI-2502", sequencia: 1, nro_nota: "NF-1002", nro_aviso: "AV-2002", data_entrada: "2026-01-16", item: "I003", quantidade: 300, descricao: "Parafuso M10x50", status: "PEND_ANAL" },
  { ordem: "OI-2503", sequencia: 1, nro_nota: "NF-1003", nro_aviso: "AV-2003", data_entrada: "2026-01-18", item: "I004", quantidade: 800, descricao: "Arruela M10 Zincada", status: "SKIP" },
  { ordem: "OI-2504", sequencia: 1, nro_nota: "NF-1004", nro_aviso: "AV-2004", data_entrada: "2026-01-20", item: "I005", quantidade: 1500, descricao: "Mola de compressão 25mm", status: "PEND_INSP" },
];

function normalizeError(error: unknown, fallback: string): string {
  if (error && typeof error === "object" && "response" in error) {
    const resp = (error as any).response;
    if (resp?.data?.message) return String(resp.data.message);
  }
  return error instanceof Error ? error.message : fallback;
}

export function Vins0201Page(): JSX.Element {
  const [filtros, setFiltros] = useState<OrdemInspecaoFilter>({ status: "PEND_INSP" });
  const [rows, setRows] = useState<OrdemRow[]>([]);
  const [hasSearch, setHasSearch] = useState(false);
  const [feedback, setFeedback] = useState<FeedbackState>(null);
  const [isSearching, setIsSearching] = useState(false);

  const setFilter = useCallback(<K extends keyof OrdemInspecaoFilter>(key: K, value: OrdemInspecaoFilter[K]) => {
    setFiltros(p => ({ ...p, [key]: value }));
  }, []);

  async function handlePesquisar() {
    setIsSearching(true); setFeedback(null);
    try { await new Promise(r => setTimeout(r, 800)); setRows(MOCK_ORDENS); setHasSearch(true); }
    catch (error) { setFeedback({ type: "error", message: normalizeError(error, "Erro na consulta.") }); }
    finally { setIsSearching(false); }
  }

  async function handleAction(action: string, ordem: string) {
    setFeedback(null);
    try {
      await new Promise(r => setTimeout(r, 500));
      setFeedback({ type: "success", message: `Ação "${action}" executada para ordem ${ordem}.` });
    } catch (error) {
      setFeedback({ type: "error", message: normalizeError(error, `Erro ao executar ${action}.`) });
    }
  }

  function handleLimpar() { setFiltros({ status: "PEND_INSP" }); setRows([]); setHasSearch(false); setFeedback(null); }

  return (
    <>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Inter:wght@300;400;500;600&display=swap');
        *, *::before, *::after { box-sizing: border-box; margin: 0; padding: 0; }

        .ins6-r{min-height:100vh;background:#f0f4ee;font-family:'Inter',sans-serif;color:#1a2e22;display:flex;flex-direction:column}

        .ins6-tb{height:52px;background:#162e20;display:flex;align-items:center;justify-content:space-between;padding:0 20px;flex-shrink:0;border-bottom:1px solid rgba(62,150,84,0.15)}
        .ins6-tbl{display:flex;align-items:center;gap:10px}
        .ins6-lg{width:28px;height:28px;background:#3e9654;border-radius:6px;display:flex;align-items:center;justify-content:center}
        .ins6-an{font-size:13px;font-weight:600;color:#e0f0e3;line-height:1.1}
        .ins6-asb{display:block;font-size:9px;font-weight:400;color:#3d6b4d}
        .ins6-st{font-size:12.5px;font-weight:500;color:#5a9a6a;padding-left:14px;margin-left:14px;border-left:1px solid rgba(255,255,255,0.08)}

        .ins6-ab{background:#fff;border-bottom:1px solid #dbe8d5;padding:0 20px;display:flex;align-items:center;gap:4px;height:46px;flex-shrink:0}
        .ins6-ag{display:flex;align-items:center;gap:4px;padding-right:12px;margin-right:8px;border-right:1px solid #e8f0e4}
        .ins6-ag:last-child{border-right:none}
        .ins6-al{font-size:9.5px;font-weight:600;letter-spacing:0.8px;text-transform:uppercase;color:#96b8a0;margin-right:4px;white-space:nowrap}
        .ins6-bt{display:inline-flex;align-items:center;gap:6px;height:32px;padding:0 12px;border:1.5px solid transparent;border-radius:7px;font-family:'Inter',sans-serif;font-size:12.5px;font-weight:500;cursor:pointer;white-space:nowrap;transition:background 0.13s,border-color 0.13s,color 0.13s}
        .ins6-bt-p{background:#162e20;color:#dff0e2;border-color:#162e20}
        .ins6-bt-p:hover:not(:disabled){background:#1e3a2a}
        .ins6-bt-p:disabled{opacity:0.5;cursor:not-allowed}
        .ins6-bt-g{background:transparent;color:#4a7060;border-color:#d4e8d0}
        .ins6-bt-g:hover:not(:disabled){background:#f0f8ec;border-color:#b0d4b8;color:#1a3828}
        .ins6-bt-g:disabled{opacity:0.5;cursor:not-allowed}
        .ins6-bt-d{background:transparent;color:#b94040;border-color:#f0c8c8}
        .ins6-bt-d:hover:not(:disabled){background:#fff0f0;border-color:#e09090}
        .ins6-bt-sm{height:28px;padding:0 9px;font-size:11px}

        .ins6-by{flex:1;padding:16px 20px;display:flex;flex-direction:column;gap:0;overflow-y:auto}
        .ins6-by::-webkit-scrollbar{width:5px}
        .ins6-by::-webkit-scrollbar-thumb{background:#cce0c8;border-radius:4px}

        .ins6-sb{display:flex;align-items:center;gap:10px;padding:14px 0 8px}
        .ins6-sb:first-child{padding-top:0}
        .ins6-sb-p{font-size:9.5px;font-weight:700;letter-spacing:1.2px;text-transform:uppercase;color:#5a8068;background:#e0ede0;border:1px solid #c8dcc8;border-radius:20px;padding:3px 10px;white-space:nowrap}
        .ins6-sb-l{flex:1;height:1px;background:#dbe8d5}
        .ins6-sb-h{font-size:11px;color:#96b8a0;white-space:nowrap}

        .ins6-c{background:#fff;border:1px solid #dbe8d5;border-radius:12px;overflow:hidden;margin-bottom:14px}
        .ins6-ch{display:flex;align-items:center;justify-content:space-between;padding:12px 18px;border-bottom:1px solid #edf5e8;background:#fafcf9}
        .ins6-chl{display:flex;align-items:center;gap:8px}
        .ins6-ct{font-size:12px;font-weight:600;color:#2a4a35;text-transform:uppercase;letter-spacing:0.6px}
        .ins6-cbg{font-size:10.5px;font-weight:500;color:#3e9654;background:#eef5ea;border:1px solid #c4dfc8;border-radius:12px;padding:2px 8px}
        .ins6-cb{padding:18px 18px}

        .ins6-fr{display:flex;align-items:flex-end;gap:12px;flex-wrap:wrap}
        .ins6-f{display:flex;flex-direction:column;gap:5px}
        .ins6-l{font-size:10.5px;font-weight:600;color:#5a8068;text-transform:uppercase;letter-spacing:0.4px;display:flex;align-items:center;gap:4px}
        .ins6-in{width:100%;height:36px;background:#f8fbf6;border:1.5px solid #d4e8cc;border-radius:7px;padding:0 10px;font-family:'Inter',sans-serif;font-size:13px;color:#1a2e22;outline:none;transition:border-color 0.13s,box-shadow 0.13s}
        .ins6-in:focus{border-color:#3e9654;box-shadow:0 0 0 2px rgba(62,150,84,0.1)}
        .ins6-in::placeholder{color:#b0c8b8;font-size:12px}
        .ins6-in[type="date"]{cursor:pointer}
        .ins6-se{width:100%;height:36px;background:#f8fbf6;border:1.5px solid #d4e8cc;border-radius:7px;padding:0 28px 0 10px;font-family:'Inter',sans-serif;font-size:13px;color:#1a2e22;outline:none;appearance:none;cursor:pointer;background-image:url("data:image/svg+xml,%3Csvg width='10' height='6' viewBox='0 0 10 6' xmlns='http://www.w3.org/2000/svg'%3E%3Cpath d='M1 1l4 4 4-4' stroke='%23789a84' stroke-width='1.5' fill='none' stroke-linecap='round' stroke-linejoin='round'/%3E%3C/svg%3E");background-repeat:no-repeat;background-position:right 10px center;transition:border-color 0.13s}
        .ins6-se:focus{border-color:#3e9654;box-shadow:0 0 0 2px rgba(62,150,84,0.1)}
        .ins6-fh{font-size:11px;color:#7a9c84;margin-top:2px;line-height:1.45}

        .ins6-rw{border-top:1px solid #edf5e8;overflow-x:auto}
        .ins6-rb{display:flex;align-items:center;justify-content:space-between;padding:10px 18px;background:#f4f9f2;border-bottom:1px solid #e8f0e4}
        .ins6-rbl{display:flex;align-items:center;gap:8px}
        .ins6-rbl-l{font-size:11px;font-weight:600;color:#4a7060;text-transform:uppercase;letter-spacing:0.5px}
        .ins6-rt{width:100%;border-collapse:collapse;font-size:13px}
        .ins6-rt th{background:#f4f9f2;padding:8px 12px;text-align:left;font-size:10.5px;font-weight:700;color:#5a8068;text-transform:uppercase;letter-spacing:0.5px;border-bottom:1.5px solid #dbe8d5;white-space:nowrap}
        .ins6-rt td{padding:9px 12px;border-bottom:1px solid #f0f6ec;color:#243830;vertical-align:middle}
        .ins6-rt tbody tr{cursor:pointer;transition:background 0.1s}
        .ins6-rt tbody tr:hover{background:#eef9f0}
        .ins6-rem{text-align:center;padding:28px 12px;color:#96b8a0;font-size:12.5px}

        .ins6-fb{display:flex;align-items:center;gap:9px;padding:11px 15px;border-radius:9px;font-size:13px;animation:ins6FdIn 0.2s ease;margin-bottom:14px}
        .ins6-fb.s{background:#f0faf2;border:1px solid #b4dec0;color:#1e6030}
        .ins6-fb.e{background:#fff5f5;border:1px solid #f8c0c0;border-left:3px solid #e05252;color:#b91c1c}
        .ins6-fb.i{background:#f0f8ff;border:1px solid #c7def8;border-left:3px solid #4a90d9;color:#1a4070}

        .ins6-ft{background:#fff;border-top:1px solid #dbe8d5;padding:8px 20px;display:flex;align-items:center;justify-content:space-between;flex-shrink:0}
        .ins6-ftl{display:flex;align-items:center;gap:20px}
        .ins6-fts{display:flex;align-items:center;gap:6px;font-size:11.5px;color:#6a8a74}
        .ins6-fts strong{color:#1a2e22;font-weight:600}

        @keyframes ins6Spin{to{transform:rotate(360deg)}}
        .ins6-sp{width:14px;height:14px;flex-shrink:0;border:2px solid rgba(223,240,226,0.3);border-top-color:#dff0e2;border-radius:50%;animation:ins6Spin 0.65s linear infinite}
        .ins6-spd{width:14px;height:14px;flex-shrink:0;border:2px solid #d4e8cc;border-top-color:#3e9654;border-radius:50%;animation:ins6Spin 0.65s linear infinite}
        @keyframes ins6FdIn{from{opacity:0;transform:translateY(-4px)}to{opacity:1;transform:translateY(0)}}

        .ins6-action-cell{display:flex;gap:4px}
      `}</style>

      <div className="ins6-r">
        <header className="ins6-tb">
          <div className="ins6-tbl">
            <div className="ins6-lg">
              <svg width="15" height="15" viewBox="0 0 18 18" fill="none">
                <rect x="1.5" y="1.5" width="6" height="6" rx="1.2" fill="rgba(255,255,255,0.9)" />
                <rect x="10.5" y="1.5" width="6" height="6" rx="1.2" fill="rgba(255,255,255,0.4)" />
                <rect x="1.5" y="10.5" width="6" height="6" rx="1.2" fill="rgba(255,255,255,0.4)" />
                <rect x="10.5" y="10.5" width="6" height="6" rx="1.2" fill="rgba(255,255,255,0.7)" />
              </svg>
            </div>
            <span className="ins6-an">Venture<span className="ins6-asb">ERP &amp; Soluções</span></span>
            <span className="ins6-st">VINS0201 — Manutenção das Ordens de Inspeções</span>
          </div>
        </header>

        <div className="ins6-ab">
          <div className="ins6-ag">
            <span className="ins6-al">Operação</span>
            <button className="ins6-bt ins6-bt-g" onClick={() => void handlePesquisar()} disabled={isSearching}>
              {isSearching ? <><div className="ins6-spd" />Buscando...</> : <><svg width="13" height="13" viewBox="0 0 16 16" fill="none"><circle cx="6.5" cy="6.5" r="4.5" stroke="currentColor" strokeWidth="1.4" /><path d="M10 10l3.5 3.5" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" /></svg>Pesquisar</>}
            </button>
          </div>
          <div className="ins6-ag">
            <span className="ins6-al">Ações</span>
            <button className="ins6-bt ins6-bt-d" onClick={handleLimpar}>
              <svg width="13" height="13" viewBox="0 0 16 16" fill="none"><path d="M3 3l10 10M13 3L3 13" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" /></svg>Limpar
            </button>
          </div>
          <div className="ins6-ag">
            <button className="ins6-bt ins6-bt-g">
              <svg width="13" height="13" viewBox="0 0 16 16" fill="none"><circle cx="8" cy="8" r="6" stroke="currentColor" strokeWidth="1.4" /><path d="M8 7v4M8 5.5h.01" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" /></svg>Ajuda
            </button>
          </div>
        </div>

        <div className="ins6-by">
          {feedback && (
            <div className={`ins6-fb ${feedback.type === "success" ? "s" : feedback.type === "error" ? "e" : "i"}`}>
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

          <div className="ins6-sb">
            <span className="ins6-sb-p">1 — Filtrar</span>
            <div className="ins6-sb-l" />
            <span className="ins6-sb-h">Preencha os filtros e clique em Pesquisar</span>
          </div>

          <div className="ins6-c">
            <div className="ins6-ch">
              <div className="ins6-chl">
                <svg width="14" height="14" viewBox="0 0 16 16" fill="none"><circle cx="6.5" cy="6.5" r="4.5" stroke="#3e9654" strokeWidth="1.4" /><path d="M10 10l3.5 3.5" stroke="#3e9654" strokeWidth="1.4" strokeLinecap="round" /></svg>
                <span className="ins6-ct">Filtros</span>
              </div>
            </div>
            <div className="ins6-cb" style={{paddingBottom:14}}>
              <div className="ins6-fr">
                <div className="ins6-f" style={{flex:"0 0 160px"}}>
                  <label className="ins6-l">Ordem Inspeção</label>
                  <input className="ins6-in" placeholder="Ex: OI-2501" value={filtros.ordem || ""} onChange={e => setFilter("ordem", e.target.value)} />
                </div>
                <div className="ins6-f" style={{flex:"0 0 180px"}}>
                  <label className="ins6-l">Nro. Nota(s)</label>
                  <input className="ins6-in" placeholder="Ex: NF-1001" value={filtros.nro_nota || ""} onChange={e => setFilter("nro_nota", e.target.value)} />
                </div>
                <div className="ins6-f" style={{flex:"0 0 220px"}}>
                  <label className="ins6-l">Fornecedor</label>
                  <input className="ins6-in" placeholder="Código ou nome" value={filtros.fornecedor || ""} onChange={e => setFilter("fornecedor", e.target.value)} />
                </div>
                <div className="ins6-f" style={{flex:"0 0 150px"}}>
                  <label className="ins6-l">Tipo</label>
                  <input className="ins6-in" placeholder="Ex: MP" value={filtros.tipo || ""} onChange={e => setFilter("tipo", e.target.value)} />
                </div>
              </div>
              <div className="ins6-fr" style={{marginTop:12}}>
                <div className="ins6-f" style={{flex:"0 0 160px"}}>
                  <label className="ins6-l">Itens</label>
                  <input className="ins6-in" placeholder="Ex: I001" value={filtros.itens || ""} onChange={e => setFilter("itens", e.target.value)} />
                </div>
                <div className="ins6-f" style={{flex:"0 0 160px"}}>
                  <label className="ins6-l">Class. Item</label>
                  <input className="ins6-in" placeholder="Ex: CLASSE-A" value={filtros.classificacao || ""} onChange={e => setFilter("classificacao", e.target.value)} />
                </div>
                <div className="ins6-f" style={{flex:"0 0 180px"}}>
                  <label className="ins6-l">Data de Entrada</label>
                  <input type="date" className="ins6-in" value={filtros.data_entrada || ""} onChange={e => setFilter("data_entrada", e.target.value)} />
                </div>
                <div className="ins6-f" style={{flex:"0 0 220px"}}>
                  <label className="ins6-l">Status</label>
                  <select className="ins6-se" value={filtros.status || ""} onChange={e => setFilter("status", e.target.value)}>
                    {STATUS_OPTIONS.map(s => <option key={s.value} value={s.value}>{s.label}</option>)}
                  </select>
                </div>
              </div>
            </div>
          </div>

          {hasSearch && (
            <>
              <div className="ins6-sb">
                <span className="ins6-sb-p">2 — Resultados</span>
                <div className="ins6-sb-l" />
                <span className="ins6-sb-h">{rows.length} ordem(ns)</span>
              </div>
              <div className="ins6-c">
                <div className="ins6-rw">
                  <div className="ins6-rb">
                    <div className="ins6-rbl">
                      <svg width="13" height="13" viewBox="0 0 16 16" fill="none"><path d="M2 4h12M2 8h12M2 12h8" stroke="#5a8068" strokeWidth="1.4" strokeLinecap="round" /></svg>
                      <span className="ins6-rbl-l">Ordens de Inspeção</span>
                      <span className="ins6-cbg">{rows.length} registro(s)</span>
                    </div>
                  </div>
                  <table className="ins6-rt">
                    <thead>
                      <tr>
                        <th style={{width:130}}>Ordem Insp.</th><th style={{width:90}}>Sequência</th>
                        <th style={{width:120}}>Nt/Aviso</th><th style={{width:120}}>Data Entrada</th>
                        <th style={{width:100}}>Item</th><th style={{width:120}}>Quantidade</th>
                        <th>Descrição</th><th style={{width:220}}>Ações</th>
                      </tr>
                    </thead>
                    <tbody>
                      {rows.map(r => (
                        <tr key={`${r.ordem}-${r.sequencia}`}>
                          <td style={{fontWeight:600,color:"#1a4a2a"}}>{r.ordem}</td>
                          <td>{r.sequencia}</td>
                          <td>{r.nro_nota} / {r.nro_aviso}</td>
                          <td>{new Date(r.data_entrada + "T00:00:00").toLocaleDateString("pt-BR")}</td>
                          <td>{r.item}</td>
                          <td>{r.quantidade.toLocaleString()}</td>
                          <td>{r.descricao}</td>
                          <td>
                            <div className="ins6-action-cell">
                              <button className="ins6-bt ins6-bt-g ins6-bt-sm" onClick={() => void handleAction("Tipo de Roteiro", r.ordem)} title="Tipo de Roteiro">
                                Tp. Rot.
                              </button>
                              <button className="ins6-bt ins6-bt-g ins6-bt-sm" onClick={() => void handleAction("Inspeção", r.ordem)} title="Inspeção">
                                Inspeção
                              </button>
                              <button className="ins6-bt ins6-bt-p ins6-bt-sm" onClick={() => void handleAction("Aprovar", r.ordem)} title="Aprovar">
                                Aprovar
                              </button>
                              <button className="ins6-bt ins6-bt-g ins6-bt-sm" onClick={() => void handleAction("Análise", r.ordem)} title="Análise">
                                Análise
                              </button>
                            </div>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            </>
          )}
        </div>

        <footer className="ins6-ft">
          <div className="ins6-ftl">
            <div className="ins6-fts">Registros: <strong>{rows.length}</strong></div>
            <div className="ins6-fts">Módulo: <strong>Inspeção</strong></div>
          </div>
          <div className="ins6-fts" style={{gap:8}}><span style={{color:"#b0c8b8",fontSize:11}}>GRUPO VENTURE LTDA</span></div>
        </footer>
      </div>
    </>
  );
}
