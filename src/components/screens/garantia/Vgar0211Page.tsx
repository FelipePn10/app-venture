import { useState, useCallback } from "react";

// ─── Types ────────────────────────────────────────────────────────────────────

interface FiltrosDevolucao {
  cliente: string;
  pedido: string;
  dataInicio: string;
  dataFim: string;
}

interface DevolucaoRow {
  cliente: string;
  clienteNome: string;
  pedido: string;
  vlrLiqIpi: number;
}

type FeedbackState = { type: "success" | "error" | "info"; message: string } | null;

const filtrosIniciais: FiltrosDevolucao = { cliente: "", pedido: "", dataInicio: "", dataFim: "" };

const MOCK_DEVOLUCOES: DevolucaoRow[] = [
  { cliente:"001", clienteNome:"SOHOME LTDA", pedido:"000150", vlrLiqIpi: 4850.00 },
  { cliente:"002", clienteNome:"ALFA S.A.", pedido:"000151", vlrLiqIpi: 12300.50 },
  { cliente:"003", clienteNome:"BETA LTDA", pedido:"000152", vlrLiqIpi: 3450.75 },
  { cliente:"004", clienteNome:"GAMA ME", pedido:"000153", vlrLiqIpi: 8900.00 },
];

function normalizeError(error: unknown, fallback: string): string {
  if (error && typeof error === "object" && "response" in error) {
    const resp = (error as any).response;
    if (resp?.data?.message) return String(resp.data.message);
  }
  if (error instanceof Error) return error.message;
  return fallback;
}

// ─── Component ────────────────────────────────────────────────────────────────

export function Vgar0211Page(): JSX.Element {
  const [filtros, setFiltros] = useState<FiltrosDevolucao>(filtrosIniciais);
  const [rows, setRows] = useState<DevolucaoRow[]>([]);
  const [feedback, setFeedback] = useState<FeedbackState>(null);
  const [isGenerating, setIsGenerating] = useState(false);
  const [hasGenerated, setHasGenerated] = useState(false);

  const setFilter = useCallback(<K extends keyof FiltrosDevolucao>(key: K, value: FiltrosDevolucao[K]) => {
    setFiltros(p => ({ ...p, [key]: value }));
  }, []);

  async function handleGerar() {
    setIsGenerating(true);
    setFeedback(null);
    try {
      await new Promise(r => setTimeout(r, 1000));
      setRows(MOCK_DEVOLUCOES);
      setHasGenerated(true);
      setFeedback({ type: "success", message: `${MOCK_DEVOLUCOES.length} pedido(s) de devolução gerado(s) com sucesso.` });
    } catch (error) {
      setFeedback({ type: "error", message: normalizeError(error, "Falha ao gerar pedidos de devolução.") });
    } finally { setIsGenerating(false); }
  }

  function handleLimpar() { setFiltros(filtrosIniciais); setRows([]); setFeedback(null); setHasGenerated(false); }

  const totalLiqIpi = rows.reduce((sum, r) => sum + r.vlrLiqIpi, 0);

  return (
    <>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Inter:wght@300;400;500;600&display=swap');
        *, *::before, *::after { box-sizing: border-box; margin: 0; padding: 0; }

        .gr-r{min-height:100vh;background:#f0f4ee;font-family:'Inter',sans-serif;color:#1a2e22;display:flex;flex-direction:column}

        .gr-tb{height:52px;background:#162e20;display:flex;align-items:center;justify-content:space-between;padding:0 20px;flex-shrink:0;border-bottom:1px solid rgba(62,150,84,0.15)}
        .gr-tbl{display:flex;align-items:center;gap:10px}
        .gr-lg{width:28px;height:28px;background:#3e9654;border-radius:6px;display:flex;align-items:center;justify-content:center}
        .gr-an{font-size:13px;font-weight:600;color:#e0f0e3;line-height:1.1}
        .gr-asb{display:block;font-size:9px;font-weight:400;color:#3d6b4d}
        .gr-st{font-size:12.5px;font-weight:500;color:#5a9a6a;padding-left:14px;margin-left:14px;border-left:1px solid rgba(255,255,255,0.08)}

        .gr-ab{background:#fff;border-bottom:1px solid #dbe8d5;padding:0 20px;display:flex;align-items:center;gap:4px;height:46px;flex-shrink:0}
        .gr-ag{display:flex;align-items:center;gap:4px;padding-right:12px;margin-right:8px;border-right:1px solid #e8f0e4}
        .gr-ag:last-child{border-right:none}
        .gr-al{font-size:9.5px;font-weight:600;letter-spacing:0.8px;text-transform:uppercase;color:#96b8a0;margin-right:4px;white-space:nowrap}
        .gr-bt{display:inline-flex;align-items:center;gap:6px;height:32px;padding:0 12px;border:1.5px solid transparent;border-radius:7px;font-family:'Inter',sans-serif;font-size:12.5px;font-weight:500;cursor:pointer;white-space:nowrap;transition:background 0.13s,border-color 0.13s,color 0.13s}
        .gr-bt-p{background:#162e20;color:#dff0e2;border-color:#162e20}
        .gr-bt-p:hover:not(:disabled){background:#1e3a2a}
        .gr-bt-p:disabled{opacity:0.5;cursor:not-allowed}
        .gr-bt-g{background:transparent;color:#4a7060;border-color:#d4e8d0}
        .gr-bt-g:hover:not(:disabled){background:#f0f8ec;border-color:#b0d4b8;color:#1a3828}
        .gr-bt-g:disabled{opacity:0.5;cursor:not-allowed}
        .gr-bt-d{background:transparent;color:#b94040;border-color:#f0c8c8}
        .gr-bt-d:hover:not(:disabled){background:#fff0f0;border-color:#e09090}
        .gr-bt-s{height:28px;padding:0 9px;font-size:12px}
        .gr-bt-n{background:#eef9f0;color:#1a6030;border-color:#b4d8b8;font-weight:600}
        .gr-bt-n:hover:not(:disabled){background:#dff5e4;border-color:#88c898}

        .gr-by{flex:1;padding:16px 20px;display:flex;flex-direction:column;gap:0;overflow-y:auto}
        .gr-by::-webkit-scrollbar{width:5px}
        .gr-by::-webkit-scrollbar-thumb{background:#cce0c8;border-radius:4px}

        .gr-sb{display:flex;align-items:center;gap:10px;padding:14px 0 8px}
        .gr-sb:first-child{padding-top:0}
        .gr-sb-p{font-size:9.5px;font-weight:700;letter-spacing:1.2px;text-transform:uppercase;color:#5a8068;background:#e0ede0;border:1px solid #c8dcc8;border-radius:20px;padding:3px 10px;white-space:nowrap}
        .gr-sb-l{flex:1;height:1px;background:#dbe8d5}
        .gr-sb-h{font-size:11px;color:#96b8a0;white-space:nowrap}

        .gr-c{background:#fff;border:1px solid #dbe8d5;border-radius:12px;overflow:hidden;margin-bottom:14px}
        .gr-ch{display:flex;align-items:center;justify-content:space-between;padding:12px 18px;border-bottom:1px solid #edf5e8;background:#fafcf9}
        .gr-chl{display:flex;align-items:center;gap:8px}
        .gr-ct{font-size:12px;font-weight:600;color:#2a4a35;text-transform:uppercase;letter-spacing:0.6px}
        .gr-cbg{font-size:10.5px;font-weight:500;color:#3e9654;background:#eef5ea;border:1px solid #c4dfc8;border-radius:12px;padding:2px 8px}
        .gr-cb{padding:18px 18px}

        .gr-fr{display:flex;align-items:flex-end;gap:12px;flex-wrap:wrap}

        .gr-g{display:grid;grid-template-columns:repeat(12,1fr);gap:16px 14px;align-items:start}
        .gr-g2{grid-column:span 2}
        .gr-g3{grid-column:span 3}
        .gr-g4{grid-column:span 4}
        .gr-g5{grid-column:span 5}
        .gr-g6{grid-column:span 6}
        .gr-g7{grid-column:span 7}
        .gr-g8{grid-column:span 8}
        .gr-g10{grid-column:span 10}
        .gr-g12{grid-column:span 12}

        .gr-f{display:flex;flex-direction:column;gap:5px}
        .gr-l{font-size:10.5px;font-weight:600;color:#5a8068;text-transform:uppercase;letter-spacing:0.4px;display:flex;align-items:center;gap:4px}
        .gr-lr{color:#c84040;font-size:12px;line-height:1}
        .gr-in{width:100%;height:36px;background:#f8fbf6;border:1.5px solid #d4e8cc;border-radius:7px;padding:0 10px;font-family:'Inter',sans-serif;font-size:13px;color:#1a2e22;outline:none;transition:border-color 0.13s,box-shadow 0.13s}
        .gr-in:focus{border-color:#3e9654;box-shadow:0 0 0 2px rgba(62,150,84,0.1)}
        .gr-in::placeholder{color:#b0c8b8;font-size:12px}
        .gr-in:disabled{background:#f0f4ee;color:#8aaa94;cursor:not-allowed;border-color:#e0ead8}
        .gr-in.has-e{border-color:#e05252;box-shadow:0 0 0 2px rgba(224,82,82,0.1)}
        .gr-in[type="date"]{cursor:pointer}
        .gr-se{width:100%;height:36px;background:#f8fbf6;border:1.5px solid #d4e8cc;border-radius:7px;padding:0 28px 0 10px;font-family:'Inter',sans-serif;font-size:13px;color:#1a2e22;outline:none;appearance:none;cursor:pointer;background-image:url("data:image/svg+xml,%3Csvg width='10' height='6' viewBox='0 0 10 6' xmlns='http://www.w3.org/2000/svg'%3E%3Cpath d='M1 1l4 4 4-4' stroke='%23789a84' stroke-width='1.5' fill='none' stroke-linecap='round' stroke-linejoin='round'/%3E%3C/svg%3E");background-repeat:no-repeat;background-position:right 10px center;transition:border-color 0.13s}
        .gr-se:focus{border-color:#3e9654;box-shadow:0 0 0 2px rgba(62,150,84,0.1)}
        .gr-fe{font-size:11px;color:#c84040;margin-top:2px;display:flex;align-items:center;gap:4px}
        .gr-fh{font-size:11px;color:#7a9c84;margin-top:2px;line-height:1.45}

        .gr-rw{border-top:1px solid #edf5e8;overflow-x:auto}
        .gr-rb{display:flex;align-items:center;justify-content:space-between;padding:10px 18px;background:#f4f9f2;border-bottom:1px solid #e8f0e4}
        .gr-rbl{display:flex;align-items:center;gap:8px}
        .gr-rbl-l{font-size:11px;font-weight:600;color:#4a7060;text-transform:uppercase;letter-spacing:0.5px}
        .gr-rt{width:100%;border-collapse:collapse;font-size:13px}
        .gr-rt th{background:#f4f9f2;padding:8px 12px;text-align:left;font-size:10.5px;font-weight:700;color:#5a8068;text-transform:uppercase;letter-spacing:0.5px;border-bottom:1.5px solid #dbe8d5;white-space:nowrap}
        .gr-rt td{padding:9px 12px;border-bottom:1px solid #f0f6ec;color:#243830;vertical-align:middle}
        .gr-rt tbody tr{cursor:pointer;transition:background 0.1s}
        .gr-rt tbody tr:hover{background:#eef9f0}
        .gr-rem{text-align:center;padding:28px 12px;color:#96b8a0;font-size:12.5px}
        .gr-rt .gr-tr{background:#f4f9f2;font-weight:700;border-top:2px solid #dbe8d5}
        .gr-rt .gr-tr td{color:#1a2e22;font-weight:700}

        .gr-fb{display:flex;align-items:center;gap:9px;padding:11px 15px;border-radius:9px;font-size:13px;animation:grFdIn 0.2s ease;margin-bottom:14px}
        .gr-fb.s{background:#f0faf2;border:1px solid #b4dec0;color:#1e6030}
        .gr-fb.e{background:#fff5f5;border:1px solid #f8c0c0;border-left:3px solid #e05252;color:#b91c1c}
        .gr-fb.i{background:#f0f8ff;border:1px solid #c7def8;border-left:3px solid #4a90d9;color:#1a4070}

        .gr-ft{background:#fff;border-top:1px solid #dbe8d5;padding:8px 20px;display:flex;align-items:center;justify-content:space-between;flex-shrink:0}
        .gr-ftl{display:flex;align-items:center;gap:20px}
        .gr-fts{display:flex;align-items:center;gap:6px;font-size:11.5px;color:#6a8a74}
        .gr-fts strong{color:#1a2e22;font-weight:600}

        @keyframes grSpin{to{transform:rotate(360deg)}}
        .gr-sp{width:14px;height:14px;flex-shrink:0;border:2px solid rgba(223,240,226,0.3);border-top-color:#dff0e2;border-radius:50%;animation:grSpin 0.65s linear infinite}
        .gr-spd{width:14px;height:14px;flex-shrink:0;border:2px solid #d4e8cc;border-top-color:#3e9654;border-radius:50%;animation:grSpin 0.65s linear infinite}
        @keyframes grFdIn{from{opacity:0;transform:translateY(-4px)}to{opacity:1;transform:translateY(0)}}
      `}</style>

      <div className="gr-r">
        <header className="gr-tb">
          <div className="gr-tbl">
            <div className="gr-lg">
              <svg width="15" height="15" viewBox="0 0 18 18" fill="none">
                <rect x="1.5" y="1.5" width="6" height="6" rx="1.2" fill="rgba(255,255,255,0.9)" />
                <rect x="10.5" y="1.5" width="6" height="6" rx="1.2" fill="rgba(255,255,255,0.4)" />
                <rect x="1.5" y="10.5" width="6" height="6" rx="1.2" fill="rgba(255,255,255,0.4)" />
                <rect x="10.5" y="10.5" width="6" height="6" rx="1.2" fill="rgba(255,255,255,0.7)" />
              </svg>
            </div>
            <span className="gr-an">Venture<span className="gr-asb">ERP &amp; Soluções</span></span>
            <span className="gr-st">VGAR0211 — Gerar Pedido de Devolução</span>
          </div>
        </header>

        <div className="gr-ab">
          <div className="gr-ag">
            <span className="gr-al">Operação</span>
            <button className="gr-bt gr-bt-n" onClick={handleGerar} disabled={isGenerating}>
              {isGenerating ? <><div className="gr-spd" />Gerando...</> : <><svg width="12" height="12" viewBox="0 0 12 12" fill="none"><path d="M6 2v8M2 6h8" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round"/></svg>Gerar Pedidos</>}
            </button>
          </div>
          <div className="gr-ag">
            <span className="gr-al">Ações</span>
            <button className="gr-bt gr-bt-d" onClick={handleLimpar} disabled={isGenerating}>
              <svg width="13" height="13" viewBox="0 0 16 16" fill="none"><path d="M3 3l10 10M13 3L3 13" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"/></svg>Limpar
            </button>
          </div>
          <div className="gr-ag">
            <button className="gr-bt gr-bt-g">
              <svg width="13" height="13" viewBox="0 0 16 16" fill="none"><circle cx="8" cy="8" r="6" stroke="currentColor" strokeWidth="1.4"/><path d="M8 7v4M8 5.5h.01" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round"/></svg>Ajuda
            </button>
          </div>
        </div>

        <div className="gr-by">
          {feedback && (
            <div className={`gr-fb ${feedback.type === "success" ? "s" : feedback.type === "error" ? "e" : "i"}`}>
              <svg width="15" height="15" viewBox="0 0 16 16" fill="none">
                {feedback.type === "success"
                  ? <path d="M3 8l3.5 3.5L13 5" stroke="#1e6030" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
                  : feedback.type === "error"
                    ? <><circle cx="8" cy="8" r="6" stroke="#e05252" strokeWidth="1.4"/><path d="M8 5v3.5M8 10.5h.01" stroke="#e05252" strokeWidth="1.4" strokeLinecap="round"/></>
                    : <><circle cx="8" cy="8" r="6" stroke="#4a90d9" strokeWidth="1.4"/><path d="M8 7v4M8 5.5h.01" stroke="#4a90d9" strokeWidth="1.4" strokeLinecap="round"/></>
                }
              </svg>
              {feedback.message}
            </div>
          )}

          <div className="gr-sb">
            <span className="gr-sb-p">1 — Filtrar</span>
            <div className="gr-sb-l" />
            <span className="gr-sb-h">Preencha os campos e clique em Gerar Pedidos</span>
          </div>

          <div className="gr-c">
            <div className="gr-ch">
              <div className="gr-chl">
                <svg width="14" height="14" viewBox="0 0 16 16" fill="none"><circle cx="6.5" cy="6.5" r="4.5" stroke="#3e9654" strokeWidth="1.4"/><path d="M10 10l3.5 3.5" stroke="#3e9654" strokeWidth="1.4" strokeLinecap="round"/></svg>
                <span className="gr-ct">Filtros</span>
              </div>
            </div>
            <div className="gr-cb" style={{paddingBottom:14}}>
              <div className="gr-fr">
                <div className="gr-f" style={{flex:"0 0 200px"}}>
                  <label className="gr-l">Cliente</label>
                  <input className="gr-in" value={filtros.cliente} onChange={e => setFilter("cliente", e.target.value)} placeholder="Código do cliente"/>
                </div>
                <div className="gr-f" style={{flex:"0 0 200px"}}>
                  <label className="gr-l">Pedido</label>
                  <input className="gr-in" value={filtros.pedido} onChange={e => setFilter("pedido", e.target.value)} placeholder="Número do pedido"/>
                </div>
                <div className="gr-f" style={{flex:"0 0 180px"}}>
                  <label className="gr-l">Data Início</label>
                  <input type="date" className="gr-in" value={filtros.dataInicio} onChange={e => setFilter("dataInicio", e.target.value)}/>
                </div>
                <div className="gr-f" style={{flex:"0 0 180px"}}>
                  <label className="gr-l">Data Fim</label>
                  <input type="date" className="gr-in" value={filtros.dataFim} onChange={e => setFilter("dataFim", e.target.value)}/>
                </div>
              </div>
            </div>
          </div>

          {hasGenerated && rows.length > 0 && (
            <>
              <div className="gr-sb">
                <span className="gr-sb-p">2 — Resultados</span>
                <div className="gr-sb-l" />
                <span className="gr-sb-h">{rows.length} pedido(s) gerado(s)</span>
              </div>
              <div className="gr-c">
                <div className="gr-rw">
                  <div className="gr-rb">
                    <div className="gr-rbl">
                      <svg width="13" height="13" viewBox="0 0 16 16" fill="none"><path d="M2 4h12M2 8h12M2 12h8" stroke="#5a8068" strokeWidth="1.4" strokeLinecap="round"/></svg>
                      <span className="gr-rbl-l">Pedidos de Devolução Gerados</span>
                      <span className="gr-cbg">{rows.length} registro(s)</span>
                    </div>
                  </div>
                  <table className="gr-rt">
                    <thead>
                      <tr>
                        <th style={{width:100}}>Cliente</th><th>Nome Cliente</th><th style={{width:120}}>Pedido</th><th style={{width:170}}>Vlr. Líq. IPI (R$)</th>
                      </tr>
                    </thead>
                    <tbody>
                      {rows.map((r, i) => (
                        <tr key={i}>
                          <td style={{fontWeight:600,color:"#1a4a2a"}}>{r.cliente}</td><td>{r.clienteNome}</td>
                          <td style={{fontWeight:600}}>#{r.pedido}</td>
                          <td>R$ {r.vlrLiqIpi.toFixed(2)}</td>
                        </tr>
                      ))}
                      <tr className="gr-tr">
                        <td colSpan={3} style={{textAlign:"right"}}>Total:</td>
                        <td>R$ {totalLiqIpi.toFixed(2)}</td>
                      </tr>
                    </tbody>
                  </table>
                </div>
              </div>
            </>
          )}
        </div>

        <footer className="gr-ft">
          <div className="gr-ftl">
            <div className="gr-fts">Pedidos: <strong>{rows.length}</strong></div>
            <div className="gr-fts">Total: <strong>R$ {totalLiqIpi.toFixed(2)}</strong></div>
            <div className="gr-fts">Módulo: <strong>Garantia</strong></div>
          </div>
          <div className="gr-fts" style={{gap:8}}>
            <span style={{color:"#b0c8b8",fontSize:11}}>GRUPO VENTURE LTDA</span>
          </div>
        </footer>
      </div>
    </>
  );
}
