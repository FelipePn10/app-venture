import { useState, useCallback } from "react";

// ─── Types ────────────────────────────────────────────────────────────────────

interface RelatorioFiltros {
  item: string;
  dataEmissaoInicio: string;
  dataEmissaoFim: string;
  centroTrabalho: string;
  opcao: string;
  selecao: string;
  somentePai: boolean;
  tipoEstrutura: string;
  quebraUM: boolean;
}

interface TempoCTRow {
  centroTrabalho: string;
  ctDesc: string;
  operacao: string;
  operacaoDesc: string;
  item: string;
  itemDesc: string;
  quantidade: number;
  um: string;
  tempoTotal: number;
  custoTotal: number;
}

type FeedbackState = { type: "success" | "error"; message: string } | null;

const SELECAO_OPTIONS = ["Notas Fiscais de Saída", "Ordens de Fabricação Encerradas"];
const ESTRUTURA_OPTIONS = ["Ativos", "Inativos", "Todos"];

const filtrosIniciais: RelatorioFiltros = {
  item:"", dataEmissaoInicio:"", dataEmissaoFim:"", centroTrabalho:"",
  opcao:"", selecao:"Notas Fiscais de Saída", somentePai:false, tipoEstrutura:"Ativos", quebraUM:false,
};

const MOCK_TEMPOS: TempoCTRow[] = [
  { centroTrabalho:"CT01", ctDesc:"Centro de Corte", operacao:"OP001", operacaoDesc:"Corte CNC", item:"IT001", itemDesc:"Produto A", quantidade:500, um:"UN", tempoTotal:425.00, custoTotal:12750.00 },
  { centroTrabalho:"CT01", ctDesc:"Centro de Corte", operacao:"OP001", operacaoDesc:"Corte CNC", item:"IT002", itemDesc:"Produto B", quantidade:300, um:"UN", tempoTotal:225.00, custoTotal:6750.00 },
  { centroTrabalho:"CT02", ctDesc:"Centro de Solda", operacao:"OP002", operacaoDesc:"Solda MIG", item:"IT001", itemDesc:"Produto A", quantidade:500, um:"UN", tempoTotal:600.00, custoTotal:18000.00 },
  { centroTrabalho:"CT03", ctDesc:"Pintura", operacao:"OP003", operacaoDesc:"Pintura Eletrostática", item:"IT001", itemDesc:"Produto A", quantidade:500, um:"UN", tempoTotal:225.00, custoTotal:5625.00 },
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

export function Vent0363Page(): JSX.Element {
  const [filtros, setFiltros] = useState<RelatorioFiltros>(filtrosIniciais);
  const [rows, setRows] = useState<TempoCTRow[]>([]);
  const [feedback, setFeedback] = useState<FeedbackState>(null);
  const [isGenerating, setIsGenerating] = useState(false);
  const [hasGenerated, setHasGenerated] = useState(false);

  const setFilter = useCallback(<K extends keyof RelatorioFiltros>(key: K, value: RelatorioFiltros[K]) => {
    setFiltros(p => ({ ...p, [key]: value }));
  }, []);

  async function handleGerar() {
    setIsGenerating(true);
    try {
      await new Promise(r => setTimeout(r, 800));
      setRows(MOCK_TEMPOS);
      setHasGenerated(true);
      setFeedback({ type: "success", message: `${MOCK_TEMPOS.length} registro(s) gerado(s).` });
    } catch (error) {
      setFeedback({ type: "error", message: normalizeError(error, "Erro ao gerar relatório.") });
    } finally { setIsGenerating(false); }
  }

  function handleLimpar() {
    setFiltros(filtrosIniciais); setRows([]); setFeedback(null); setHasGenerated(false);
  }

  const totalTempo = rows.reduce((s,r) => s + r.tempoTotal, 0);
  const totalCusto = rows.reduce((s,r) => s + r.custoTotal, 0);

  return (
    <>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Inter:wght@300;400;500;600&display=swap');
        *, *::before, *::after { box-sizing: border-box; margin: 0; padding: 0; }

        .en-root {
          min-height: 100vh; background: #f0f4ee;
          font-family: 'Inter', sans-serif; color: #1a2e22;
          display: flex; flex-direction: column;
        }

        .en-topbar {
          height: 52px; background: #162e20;
          display: flex; align-items: center; justify-content: space-between;
          padding: 0 20px; flex-shrink: 0;
        }
        .en-topbar-left { display: flex; align-items: center; gap: 10px; }
        .en-logo-mark {
          width: 28px; height: 28px; background: #3e9654;
          border-radius: 6px; display: flex; align-items: center; justify-content: center;
        }
        .en-app-name { font-size: 13px; font-weight: 600; color: #e0f0e3; line-height: 1.1; }
        .en-app-sub  { display: block; font-size: 9px; font-weight: 400; color: #3d6b4d; }
        .en-screen-title {
          font-size: 12.5px; font-weight: 500; color: #5a9a6a;
          padding-left: 14px; margin-left: 14px;
          border-left: 1px solid rgba(255,255,255,0.08);
        }

        .en-actionbar {
          background: #fff; border-bottom: 1px solid #dbe8d5;
          padding: 0 20px; display: flex; align-items: center;
          gap: 4px; height: 46px; flex-shrink: 0;
        }
        .en-action-group {
          display: flex; align-items: center; gap: 4px;
          padding-right: 12px; margin-right: 8px;
          border-right: 1px solid #e8f0e4;
        }
        .en-action-group:last-child { border-right: none; }
        .en-action-label {
          font-size: 9.5px; font-weight: 600; letter-spacing: 0.8px;
          text-transform: uppercase; color: #96b8a0; margin-right: 4px; white-space: nowrap;
        }
        .en-btn {
          display: inline-flex; align-items: center; gap: 6px;
          height: 32px; padding: 0 12px; border: 1.5px solid transparent;
          border-radius: 7px; font-family: 'Inter', sans-serif;
          font-size: 12.5px; font-weight: 500; cursor: pointer; white-space: nowrap;
          transition: background 0.13s, border-color 0.13s, color 0.13s;
        }
        .en-bt-p { background: #162e20; color: #dff0e2; border-color: #162e20; }
        .en-bt-p:hover:not(:disabled) { background: #1e3a2a; }
        .en-bt-p:disabled { opacity: 0.5; cursor: not-allowed; }
        .en-bt-g { background: transparent; color: #4a7060; border-color: #d4e8d0; }
        .en-bt-g:hover:not(:disabled) { background: #f0f8ec; border-color: #b0d4b8; color: #1a3828; }
        .en-bt-g:disabled { opacity: 0.5; cursor: not-allowed; }
        .en-bt-d { background: transparent; color: #b94040; border-color: #f0c8c8; }
        .en-bt-d:hover:not(:disabled) { background: #fff0f0; border-color: #e09090; }
        .en-bt-sm { height: 28px; padding: 0 9px; font-size: 12px; }

        .en-body {
          flex: 1; padding: 16px 20px; display: flex;
          flex-direction: column; gap: 0; overflow-y: auto;
        }
        .en-body::-webkit-scrollbar { width: 5px; }
        .en-body::-webkit-scrollbar-thumb { background: #cce0c8; border-radius: 4px; }

        .en-section-banner {
          display: flex; align-items: center; gap: 10px;
          padding: 14px 0 8px;
        }
        .en-section-banner:first-child { padding-top: 0; }
        .en-section-pill {
          font-size: 9.5px; font-weight: 700; letter-spacing: 1.2px;
          text-transform: uppercase; color: #5a8068;
          background: #e0ede0; border: 1px solid #c8dcc8;
          border-radius: 20px; padding: 3px 10px; white-space: nowrap;
        }
        .en-section-line { flex: 1; height: 1px; background: #dbe8d5; }
        .en-section-hint { font-size: 11px; color: #96b8a0; white-space: nowrap; }

        .en-card {
          background: #fff; border: 1px solid #dbe8d5;
          border-radius: 12px; overflow: hidden; margin-bottom: 14px;
        }
        .en-card-header {
          display: flex; align-items: center; justify-content: space-between;
          padding: 12px 18px; border-bottom: 1px solid #edf5e8; background: #fafcf9;
        }
        .en-card-header-left { display: flex; align-items: center; gap: 8px; }
        .en-card-title { font-size: 12px; font-weight: 600; color: #2a4a35; text-transform: uppercase; letter-spacing: 0.6px; }
        .en-card-badge {
          font-size: 10.5px; font-weight: 500; color: #3e9654;
          background: #eef5ea; border: 1px solid #c4dfc8; border-radius: 12px; padding: 2px 8px;
        }
        .en-card-body { padding: 18px 18px; }

        .en-grid { display: grid; grid-template-columns: repeat(12, 1fr); gap: 16px 14px; align-items: start; }
        .en-g2  { grid-column: span 2; }
        .en-g3  { grid-column: span 3; }
        .en-g4  { grid-column: span 4; }
        .en-g5  { grid-column: span 5; }
        .en-g6  { grid-column: span 6; }
        .en-g12 { grid-column: span 12; }

        .en-field { display: flex; flex-direction: column; gap: 5px; }
        .en-label {
          font-size: 10.5px; font-weight: 600; color: #5a8068;
          text-transform: uppercase; letter-spacing: 0.4px;
          display: flex; align-items: center; gap: 4px;
        }
        .en-input {
          width: 100%; height: 36px; background: #f8fbf6;
          border: 1.5px solid #d4e8cc; border-radius: 7px;
          padding: 0 10px; font-family: 'Inter', sans-serif;
          font-size: 13px; color: #1a2e22; outline: none;
          transition: border-color 0.13s, box-shadow 0.13s;
        }
        .en-input:focus { border-color: #3e9654; box-shadow: 0 0 0 2px rgba(62,150,84,0.1); }
        .en-input::placeholder { color: #b0c8b8; font-size: 12px; }
        .en-input[type="date"] { cursor: pointer; }

        .en-select {
          width: 100%; height: 36px; background: #f8fbf6;
          border: 1.5px solid #d4e8cc; border-radius: 7px;
          padding: 0 28px 0 10px; font-family: 'Inter', sans-serif;
          font-size: 13px; color: #1a2e22; outline: none;
          appearance: none; cursor: pointer;
          background-image: url("data:image/svg+xml,%3Csvg width='10' height='6' viewBox='0 0 10 6' xmlns='http://www.w3.org/2000/svg'%3E%3Cpath d='M1 1l4 4 4-4' stroke='%23789a84' stroke-width='1.5' fill='none' stroke-linecap='round' stroke-linejoin='round'/%3E%3C/svg%3E");
          background-repeat: no-repeat; background-position: right 10px center;
          transition: border-color 0.13s;
        }
        .en-select:focus { border-color: #3e9654; box-shadow: 0 0 0 2px rgba(62,150,84,0.1); }

        .en-chk-row { display: flex; align-items: center; gap: 8px; font-size: 13px; color: #3a5a45; padding-top: 2px; }
        .en-chk { width: 15px; height: 15px; accent-color: #3e9654; cursor: pointer; }

        .en-section-sep { height: 1px; background: #edf5e8; margin: 20px 0; }
        .en-section-label {
          font-size: 10px; font-weight: 700; letter-spacing: 1px;
          text-transform: uppercase; color: #a0b8a8; margin-bottom: 14px;
          display: flex; align-items: center; gap: 8px;
        }
        .en-section-label::after { content: ''; flex: 1; height: 1px; background: #e8f0e4; }

        .en-results-wrap { border-top: 1px solid #edf5e8; overflow-x: auto; }
        .en-results-bar {
          display: flex; align-items: center; justify-content: space-between;
          padding: 10px 18px; background: #f4f9f2; border-bottom: 1px solid #e8f0e4;
        }
        .en-results-bar-left { display: flex; align-items: center; gap: 8px; }
        .en-results-bar-label { font-size: 11px; font-weight: 600; color: #4a7060; text-transform: uppercase; letter-spacing: 0.5px; }
        .en-results-hint { font-size: 11px; color: #96b8a0; }
        .en-results-table { width: 100%; border-collapse: collapse; font-size: 13px; }
        .en-results-table th {
          background: #f4f9f2; padding: 8px 12px; text-align: left;
          font-size: 10.5px; font-weight: 700; color: #5a8068;
          text-transform: uppercase; letter-spacing: 0.5px;
          border-bottom: 1.5px solid #dbe8d5; white-space: nowrap;
        }
        .en-results-table td { padding: 9px 12px; border-bottom: 1px solid #f0f6ec; color: #243830; vertical-align: middle; }
        .en-results-table tbody tr:hover { background: #eef9f0; }
        .en-results-empty { text-align: center; padding: 28px 12px; color: #96b8a0; font-size: 12.5px; }
        .en-total-row { background: #f4f9f2; font-weight: 700; }
        .en-total-row td { color: #1a4a2a; font-weight: 700; }

        .en-feedback {
          display: flex; align-items: center; gap: 9px; padding: 11px 15px;
          border-radius: 9px; font-size: 13px; animation: enFadeIn 0.2s ease;
          margin-bottom: 14px;
        }
        .en-fb-success { background: #f0faf2; border: 1px solid #b4dec0; color: #1e6030; }
        .en-fb-error   { background: #fff5f5; border: 1px solid #f8c0c0; border-left: 3px solid #e05252; color: #b91c1c; }

        .en-footer {
          background: #fff; border-top: 1px solid #dbe8d5;
          padding: 8px 20px; display: flex; align-items: center;
          justify-content: space-between; flex-shrink: 0;
        }
        .en-footer-left { display: flex; align-items: center; gap: 20px; }
        .en-footer-stat { display: flex; align-items: center; gap: 6px; font-size: 11.5px; color: #6a8a74; }
        .en-footer-stat strong { color: #1a2e22; font-weight: 600; }

        @keyframes en-spin { to { transform: rotate(360deg); } }
        .en-spinner {
          width: 14px; height: 14px; flex-shrink: 0;
          border: 2px solid rgba(223,240,226,0.3); border-top-color: #dff0e2;
          border-radius: 50%; animation: en-spin 0.65s linear infinite;
        }
        @keyframes enFadeIn { from { opacity: 0; transform: translateY(-4px); } to { opacity: 1; transform: translateY(0); } }
      `}</style>

      <div className="en-root">

        <header className="en-topbar">
          <div className="en-topbar-left">
            <div className="en-logo-mark">
              <svg width="15" height="15" viewBox="0 0 18 18" fill="none">
                <rect x="1.5" y="1.5" width="6" height="6" rx="1.2" fill="rgba(255,255,255,0.9)" />
                <rect x="10.5" y="1.5" width="6" height="6" rx="1.2" fill="rgba(255,255,255,0.4)" />
                <rect x="1.5" y="10.5" width="6" height="6" rx="1.2" fill="rgba(255,255,255,0.4)" />
                <rect x="10.5" y="10.5" width="6" height="6" rx="1.2" fill="rgba(255,255,255,0.7)" />
              </svg>
            </div>
            <span className="en-app-name">
              Venture<span className="en-app-sub">ERP &amp; Soluções</span>
            </span>
            <span className="en-screen-title">VENT0363 — Relatório de Tempo de Centro de Trabalho</span>
          </div>
        </header>

        <div className="en-actionbar">
          <div className="en-action-group">
            <span className="en-action-label">Relatório</span>
            <button
              className="en-btn en-bt-p"
              onClick={handleGerar}
              disabled={isGenerating}
            >
              {isGenerating
                ? <><div className="en-spinner" />Gerando...</>
                : <>
                    <svg width="13" height="13" viewBox="0 0 16 16" fill="none">
                      <path d="M2 2h9l3 3v9a1 1 0 01-1 1H3a1 1 0 01-1-1V3a1 1 0 011-1z" stroke="currentColor" strokeWidth="1.4" strokeLinejoin="round" />
                      <path d="M5 2v4h6V2M5 9h6" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" />
                    </svg>
                    Gerar Relatório
                  </>
              }
            </button>
          </div>
          <div className="en-action-group">
            <button
              className="en-btn en-bt-d"
              onClick={handleLimpar}
              disabled={isGenerating}
            >
              <svg width="13" height="13" viewBox="0 0 16 16" fill="none">
                <path d="M3 3l10 10M13 3L3 13" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
              </svg>
              Limpar
            </button>
          </div>
        </div>

        <div className="en-body">

          {feedback && (
            <div className={`en-feedback ${feedback.type === "success" ? "en-fb-success" : "en-fb-error"}`}>
              <svg width="15" height="15" viewBox="0 0 16 16" fill="none">
                {feedback.type === "success"
                  ? <path d="M3 8l3.5 3.5L13 5" stroke="#1e6030" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
                  : <><circle cx="8" cy="8" r="6" stroke="#e05252" strokeWidth="1.4" /><path d="M8 5v3.5M8 10.5h.01" stroke="#e05252" strokeWidth="1.4" strokeLinecap="round" /></>
                }
              </svg>
              {feedback.message}
            </div>
          )}

          <div className="en-section-banner">
            <span className="en-section-pill">1 — Filtros</span>
            <div className="en-section-line" />
            <span className="en-section-hint">Preencha os filtros e clique em Gerar Relatório</span>
          </div>

          <div className="en-card">
            <div className="en-card-header">
              <div className="en-card-header-left">
                <svg width="14" height="14" viewBox="0 0 16 16" fill="none">
                  <circle cx="6.5" cy="6.5" r="4.5" stroke="#3e9654" strokeWidth="1.4" />
                  <path d="M10 10l3.5 3.5" stroke="#3e9654" strokeWidth="1.4" strokeLinecap="round" />
                </svg>
                <span className="en-card-title">Filtros do Relatório</span>
              </div>
            </div>

            <div className="en-card-body">
              <div className="en-section-label">Parâmetros</div>
              <div className="en-grid">
                <div className="en-field en-g2">
                  <label className="en-label">Item</label>
                  <input className="en-input" placeholder="Código do item" value={filtros.item} onChange={e => setFilter("item", e.target.value)} />
                </div>
                <div className="en-field en-g3">
                  <label className="en-label">Data Emissão Início</label>
                  <input type="date" className="en-input" value={filtros.dataEmissaoInicio} onChange={e => setFilter("dataEmissaoInicio", e.target.value)} />
                </div>
                <div className="en-field en-g3">
                  <label className="en-label">Data Emissão Fim</label>
                  <input type="date" className="en-input" value={filtros.dataEmissaoFim} onChange={e => setFilter("dataEmissaoFim", e.target.value)} />
                </div>
                <div className="en-field en-g2">
                  <label className="en-label">Centro de Trabalho</label>
                  <input className="en-input" placeholder="Código CT" value={filtros.centroTrabalho} onChange={e => setFilter("centroTrabalho", e.target.value)} />
                </div>
                <div className="en-field en-g2">
                  <label className="en-label">Seleção</label>
                  <select className="en-select" value={filtros.selecao} onChange={e => setFilter("selecao", e.target.value)}>
                    {SELECAO_OPTIONS.map(s => <option key={s} value={s}>{s}</option>)}
                  </select>
                </div>
              </div>

              <div className="en-section-sep" />

              <div className="en-section-label">Estrutura e Opções</div>
              <div className="en-grid">
                <div className="en-field en-g2">
                  <label className="en-label">Tipo Estrutura</label>
                  <select className="en-select" value={filtros.tipoEstrutura} onChange={e => setFilter("tipoEstrutura", e.target.value)}>
                    {ESTRUTURA_OPTIONS.map(s => <option key={s} value={s}>{s}</option>)}
                  </select>
                </div>
                <div className="en-field en-g2">
                  <label className="en-label">Opção</label>
                  <select className="en-select" value={filtros.opcao} onChange={e => setFilter("opcao", e.target.value)}>
                    <option value="">Todas</option><option value="comCusto">Com Custos</option><option value="semCusto">Sem Custos</option>
                  </select>
                </div>
                <div className="en-field en-g2" style={{ justifyContent: "flex-end" }}>
                  <label className="en-chk-row">
                    <input type="checkbox" className="en-chk" checked={filtros.somentePai} onChange={e => setFilter("somentePai", e.target.checked)} />
                    Somente Pai
                  </label>
                </div>
                <div className="en-field en-g2" style={{ justifyContent: "flex-end" }}>
                  <label className="en-chk-row">
                    <input type="checkbox" className="en-chk" checked={filtros.quebraUM} onChange={e => setFilter("quebraUM", e.target.checked)} />
                    Quebra Unidade Medida
                  </label>
                </div>
              </div>
            </div>
          </div>

          {hasGenerated && (
            <>
              <div className="en-section-banner">
                <span className="en-section-pill">2 — Resultados</span>
                <div className="en-section-line" />
                <span className="en-section-hint">{rows.length} registro(s) encontrado(s)</span>
              </div>

              <div className="en-card">
                <div className="en-card-header">
                  <div className="en-card-header-left">
                    <svg width="14" height="14" viewBox="0 0 16 16" fill="none">
                      <path d="M2 4h12M2 8h12M2 12h8" stroke="#3e9654" strokeWidth="1.4" strokeLinecap="round" />
                    </svg>
                    <span className="en-card-title">Relatório de Tempo</span>
                  </div>
                  <span className="en-card-badge">{rows.length} registros</span>
                </div>
                <div className="en-results-wrap">
                  <table className="en-results-table">
                    <thead>
                      <tr>
                        <th>CT</th><th>Descrição CT</th><th>Operação</th><th>Descrição Op.</th>
                        <th>Item</th><th>Descrição Item</th><th style={{textAlign:"right"}}>Qtd</th><th>UM</th>
                        <th style={{textAlign:"right"}}>Tempo Total (h)</th><th style={{textAlign:"right"}}>Custo Total (R$)</th>
                      </tr>
                    </thead>
                    <tbody>
                      {rows.map((r, i) => (
                        <tr key={i}>
                          <td style={{fontWeight:600,color:"#1a4a2a"}}>{r.centroTrabalho}</td><td>{r.ctDesc}</td>
                          <td>{r.operacao}</td><td>{r.operacaoDesc}</td>
                          <td>{r.item}</td><td>{r.itemDesc}</td>
                          <td style={{textAlign:"right"}}>{r.quantidade}</td><td>{r.um}</td>
                          <td style={{textAlign:"right"}}>{r.tempoTotal.toFixed(2)}</td>
                          <td style={{textAlign:"right"}}>R$ {r.custoTotal.toFixed(2)}</td>
                        </tr>
                      ))}
                    </tbody>
                    <tfoot>
                      <tr className="en-total-row">
                        <td colSpan={8} style={{textAlign:"right"}}>Totais:</td>
                        <td style={{textAlign:"right"}}>{totalTempo.toFixed(2)}</td>
                        <td style={{textAlign:"right"}}>R$ {totalCusto.toFixed(2)}</td>
                      </tr>
                    </tfoot>
                  </table>
                </div>
              </div>
            </>
          )}
        </div>

        <footer className="en-footer">
          <div className="en-footer-left">
            <div className="en-footer-stat">
              Registros: <strong>{rows.length}</strong>
            </div>
            <div className="en-footer-stat">
              Tempo Total: <strong>{totalTempo.toFixed(2)}h</strong>
            </div>
            <div className="en-footer-stat">
              Custo Total: <strong>R$ {totalCusto.toFixed(2)}</strong>
            </div>
          </div>
          <span style={{color:"#b0c8b8",fontSize:11}}>GRUPO VENTURE LTDA</span>
        </footer>

      </div>
    </>
  );
}
