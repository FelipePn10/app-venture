import { useState, useCallback } from "react";

// ─── Types ────────────────────────────────────────────────────────────────────

interface ConsultaFiltros {
  plano: string;
  ordemInicio: string;
  ordemFim: string;
  dtSolicitacaoInicio: string;
  dtSolicitacaoFim: string;
  dtFechamentoInicio: string;
  dtFechamentoFim: string;
  solicitante: string;
  servicos: string;
  executor: string;
  executoresOrdem: boolean;
  executoresApontamentos: boolean;
  grRecurso: string;
  recurso: string;
  tipo: string;
  planejadas: boolean;
  liberadas: boolean;
  firmes: boolean;
  encerradas: boolean;
}

interface OrdemManutRow {
  emp: string;
  numOrdem: string;
  tipo: string;
  recurso: string;
  recursoDesc: string;
  emissao: string;
  fechamento: string;
  solicitante: string;
  situacao: string;
  status: string;
  urgente: boolean;
  prevista: string;
  tipoProblema: string;
}

type FeedbackState = { type: "success" | "error"; message: string } | null;

const filtrosIniciais: ConsultaFiltros = {
  plano:"", ordemInicio:"", ordemFim:"", dtSolicitacaoInicio:"", dtSolicitacaoFim:"",
  dtFechamentoInicio:"", dtFechamentoFim:"", solicitante:"", servicos:"", executor:"",
  executoresOrdem:false, executoresApontamentos:false, grRecurso:"", recurso:"",
  tipo:"", planejadas:false, liberadas:true, firmes:true, encerradas:false,
};

const MOCK_ORDENS: OrdemManutRow[] = [
  { emp:"01", numOrdem:"OS0001", tipo:"Corretiva", recurso:"MAQ01", recursoDesc:"Prensa 500T", emissao:"05/05/2026", fechamento:"", solicitante:"Carlos Mecânico", situacao:"Liberada", status:"Em andamento", urgente:true, prevista:"07/05/2026", tipoProblema:"Hidráulico" },
  { emp:"01", numOrdem:"OS0002", tipo:"Preventiva", recurso:"MAQ02", recursoDesc:"Centro CNC", emissao:"01/05/2026", fechamento:"03/05/2026", solicitante:"Ana Planejamento", situacao:"Firme", status:"Encerrada", urgente:false, prevista:"02/05/2026", tipoProblema:"Mecânico" },
  { emp:"02", numOrdem:"OS0003", tipo:"Corretiva", recurso:"MAQ03", recursoDesc:"Compressor", emissao:"08/05/2026", fechamento:"", solicitante:"Pedro Operador", situacao:"Liberada", status:"Aguardando", urgente:false, prevista:"10/05/2026", tipoProblema:"Elétrico" },
  { emp:"01", numOrdem:"OS0004", tipo:"Programada", recurso:"MAQ04", recursoDesc:"Torno CNC", emissao:"10/05/2026", fechamento:"", solicitante:"Carlos Mecânico", situacao:"Liberada", status:"Em andamento", urgente:false, prevista:"12/05/2026", tipoProblema:"Preventivo" },
];

// ─── Component ────────────────────────────────────────────────────────────────

export function Vman0401Page(): JSX.Element {
  const [filtros, setFiltros] = useState<ConsultaFiltros>(filtrosIniciais);
  const [rows, setRows] = useState<OrdemManutRow[]>([]);
  const [feedback, setFeedback] = useState<FeedbackState>(null);
  const [isSearching, setIsSearching] = useState(false);
  const [hasSearched, setHasSearched] = useState(false);
  const [showServicos, setShowServicos] = useState<string | null>(null);

  const setFilter = useCallback(<K extends keyof ConsultaFiltros>(key: K, value: ConsultaFiltros[K]) => {
    setFiltros(p => ({ ...p, [key]: value }));
  }, []);

  async function handleConsultar() {
    setIsSearching(true);
    try {
      await new Promise(r => setTimeout(r, 500));
      setRows(MOCK_ORDENS);
      setHasSearched(true);
      setFeedback({ type: "success", message: `${MOCK_ORDENS.length} ordem(ns) encontrada(s).` });
    } catch (error) {
      setFeedback({ type: "error", message: "Erro na consulta." });
    } finally { setIsSearching(false); }
  }

  function handleLimpar() { setFiltros(filtrosIniciais); setRows([]); setFeedback(null); setHasSearched(false); }

  const MOCK_SERVICOS = [
    { servico:"SVC001", dataInicio:"05/05/2026", horaInicio:"08:00", dataFim:"05/05/2026", horaFim:"12:00", tempo:"4h", um:"H", valorGastos:"0,00", diagnostico:"Vazamento hidráulico", causa:"Desgaste", efeito:"Parada máquina" },
  ];

  const MOCK_ITENS_UTILIZADOS = [
    { item:"MP001", quantidade:3, observacao:"Mangueira 1\"" },
    { item:"MP002", quantidade:20, observacao:"Óleo ISO 68" },
  ];

  return (
    <>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Inter:wght@300;400;500;600&display=swap');
        *, *::before, *::after { box-sizing: border-box; margin: 0; padding: 0; }

        .m4-root {
          min-height: 100vh; background: #f0f4ee;
          font-family: 'Inter', sans-serif; color: #1a2e22;
          display: flex; flex-direction: column;
        }

        .m4-topbar {
          height: 52px; background: #162e20;
          display: flex; align-items: center; justify-content: space-between;
          padding: 0 20px; flex-shrink: 0;
        }
        .m4-topbar-left { display: flex; align-items: center; gap: 10px; }
        .m4-logo-mark {
          width: 28px; height: 28px; background: #3e9654;
          border-radius: 6px; display: flex; align-items: center; justify-content: center;
        }
        .m4-app-name { font-size: 13px; font-weight: 600; color: #e0f0e3; line-height: 1.1; }
        .m4-app-sub  { display: block; font-size: 9px; font-weight: 400; color: #3d6b4d; }
        .m4-screen-title {
          font-size: 12.5px; font-weight: 500; color: #5a9a6a;
          padding-left: 14px; margin-left: 14px;
          border-left: 1px solid rgba(255,255,255,0.08);
        }

        .m4-actionbar {
          background: #fff; border-bottom: 1px solid #dbe8d5;
          padding: 0 20px; display: flex; align-items: center;
          gap: 4px; height: 46px; flex-shrink: 0;
        }
        .m4-action-group {
          display: flex; align-items: center; gap: 4px;
          padding-right: 12px; margin-right: 8px;
          border-right: 1px solid #e8f0e4;
        }
        .m4-action-group:last-child { border-right: none; }
        .m4-action-label {
          font-size: 9.5px; font-weight: 600; letter-spacing: 0.8px;
          text-transform: uppercase; color: #96b8a0; margin-right: 4px; white-space: nowrap;
        }
        .m4-btn {
          display: inline-flex; align-items: center; gap: 6px;
          height: 32px; padding: 0 12px; border: 1.5px solid transparent;
          border-radius: 7px; font-family: 'Inter', sans-serif;
          font-size: 12.5px; font-weight: 500; cursor: pointer; white-space: nowrap;
          transition: background 0.13s, border-color 0.13s, color 0.13s;
        }
        .m4-bt-p { background: #162e20; color: #dff0e2; border-color: #162e20; }
        .m4-bt-p:hover:not(:disabled) { background: #1e3a2a; }
        .m4-bt-p:disabled { opacity: 0.5; cursor: not-allowed; }
        .m4-bt-g { background: transparent; color: #4a7060; border-color: #d4e8d0; }
        .m4-bt-g:hover:not(:disabled) { background: #f0f8ec; border-color: #b0d4b8; color: #1a3828; }
        .m4-bt-g:disabled { opacity: 0.5; cursor: not-allowed; }
        .m4-bt-d { background: transparent; color: #b94040; border-color: #f0c8c8; }
        .m4-bt-d:hover:not(:disabled) { background: #fff0f0; border-color: #e09090; }
        .m4-bt-sm { height: 28px; padding: 0 9px; font-size: 12px; }

        .m4-body {
          flex: 1; padding: 16px 20px; display: flex;
          flex-direction: column; gap: 0; overflow-y: auto;
        }
        .m4-body::-webkit-scrollbar { width: 5px; }
        .m4-body::-webkit-scrollbar-thumb { background: #cce0c8; border-radius: 4px; }

        .m4-section-banner {
          display: flex; align-items: center; gap: 10px;
          padding: 14px 0 8px;
        }
        .m4-section-banner:first-child { padding-top: 0; }
        .m4-section-pill {
          font-size: 9.5px; font-weight: 700; letter-spacing: 1.2px;
          text-transform: uppercase; color: #5a8068;
          background: #e0ede0; border: 1px solid #c8dcc8;
          border-radius: 20px; padding: 3px 10px; white-space: nowrap;
        }
        .m4-section-line { flex: 1; height: 1px; background: #dbe8d5; }
        .m4-section-hint { font-size: 11px; color: #96b8a0; white-space: nowrap; }

        .m4-card {
          background: #fff; border: 1px solid #dbe8d5;
          border-radius: 12px; overflow: hidden; margin-bottom: 14px;
        }
        .m4-card-header {
          display: flex; align-items: center; justify-content: space-between;
          padding: 12px 18px; border-bottom: 1px solid #edf5e8; background: #fafcf9;
        }
        .m4-card-header-left { display: flex; align-items: center; gap: 8px; }
        .m4-card-title { font-size: 12px; font-weight: 600; color: #2a4a35; text-transform: uppercase; letter-spacing: 0.6px; }
        .m4-card-badge {
          font-size: 10.5px; font-weight: 500; color: #3e9654;
          background: #eef5ea; border: 1px solid #c4dfc8; border-radius: 12px; padding: 2px 8px;
        }
        .m4-card-body { padding: 18px 18px; }

        .m4-grid { display: grid; grid-template-columns: repeat(12, 1fr); gap: 16px 14px; align-items: start; }
        .m4-g2  { grid-column: span 2; }
        .m4-g3  { grid-column: span 3; }
        .m4-g4  { grid-column: span 4; }
        .m4-g6  { grid-column: span 6; }
        .m4-g12 { grid-column: span 12; }

        .m4-field { display: flex; flex-direction: column; gap: 5px; }
        .m4-label {
          font-size: 10.5px; font-weight: 600; color: #5a8068;
          text-transform: uppercase; letter-spacing: 0.4px;
          display: flex; align-items: center; gap: 4px;
        }
        .m4-input {
          width: 100%; height: 36px; background: #f8fbf6;
          border: 1.5px solid #d4e8cc; border-radius: 7px;
          padding: 0 10px; font-family: 'Inter', sans-serif;
          font-size: 13px; color: #1a2e22; outline: none;
          transition: border-color 0.13s, box-shadow 0.13s;
        }
        .m4-input:focus { border-color: #3e9654; box-shadow: 0 0 0 2px rgba(62,150,84,0.1); }
        .m4-input::placeholder { color: #b0c8b8; font-size: 12px; }
        .m4-input:disabled { background: #f0f4ee; color: #8aaa94; cursor: not-allowed; border-color: #e0ead8; }
        .m4-input[type="date"] { cursor: pointer; }

        .m4-select {
          width: 100%; height: 36px; background: #f8fbf6;
          border: 1.5px solid #d4e8cc; border-radius: 7px;
          padding: 0 28px 0 10px; font-family: 'Inter', sans-serif;
          font-size: 13px; color: #1a2e22; outline: none;
          appearance: none; cursor: pointer;
          background-image: url("data:image/svg+xml,%3Csvg width='10' height='6' viewBox='0 0 10 6' xmlns='http://www.w3.org/2000/svg'%3E%3Cpath d='M1 1l4 4 4-4' stroke='%23789a84' stroke-width='1.5' fill='none' stroke-linecap='round' stroke-linejoin='round'/%3E%3C/svg%3E");
          background-repeat: no-repeat; background-position: right 10px center;
          transition: border-color 0.13s;
        }
        .m4-select:focus { border-color: #3e9654; box-shadow: 0 0 0 2px rgba(62,150,84,0.1); }

        .m4-chk-row { display: flex; align-items: center; gap: 6px; font-size: 12.5px; color: #3a5a45; white-space: nowrap; cursor: pointer; }
        .m4-chk { width: 14px; height: 14px; accent-color: #3e9654; cursor: pointer; }

        .m4-section-sep { height: 1px; background: #edf5e8; margin: 20px 0; }
        .m4-section-label {
          font-size: 10px; font-weight: 700; letter-spacing: 1px;
          text-transform: uppercase; color: #a0b8a8; margin-bottom: 14px;
          display: flex; align-items: center; gap: 8px;
        }
        .m4-section-label::after { content: ''; flex: 1; height: 1px; background: #e8f0e4; }

        .m4-results-wrap { border-top: 1px solid #edf5e8; overflow-x: auto; }
        .m4-results-bar {
          display: flex; align-items: center; justify-content: space-between;
          padding: 10px 18px; background: #f4f9f2; border-bottom: 1px solid #e8f0e4;
        }
        .m4-results-bar-left { display: flex; align-items: center; gap: 8px; }
        .m4-results-bar-label { font-size: 11px; font-weight: 600; color: #4a7060; text-transform: uppercase; letter-spacing: 0.5px; }
        .m4-results-hint { font-size: 11px; color: #96b8a0; }
        .m4-results-table { width: 100%; border-collapse: collapse; font-size: 13px; }
        .m4-results-table th {
          background: #f4f9f2; padding: 8px 12px; text-align: left;
          font-size: 10.5px; font-weight: 700; color: #5a8068;
          text-transform: uppercase; letter-spacing: 0.5px;
          border-bottom: 1.5px solid #dbe8d5; white-space: nowrap;
        }
        .m4-results-table td { padding: 9px 12px; border-bottom: 1px solid #f0f6ec; color: #243830; vertical-align: middle; }
        .m4-results-table tbody tr:hover { background: #eef9f0; }
        .m4-results-empty { text-align: center; padding: 28px 12px; color: #96b8a0; font-size: 12.5px; }

        .m4-badge {
          display: inline-flex; align-items: center;
          font-size: 11px; font-weight: 600; border-radius: 12px; padding: 2px 8px;
        }
        .m4-bd-urgente { background: #fee2e2; color: #991b1b; border: 1px solid #f8b0b0; }
        .m4-bd-liberada { background: #e8f5e0; color: #2a6018; border: 1px solid #b4d898; }
        .m4-bd-firme { background: #e8f0fc; color: #1a4080; border: 1px solid #a8c0e8; }

        .m4-feedback {
          display: flex; align-items: center; gap: 9px; padding: 11px 15px;
          border-radius: 9px; font-size: 13px; animation: m4FadeIn 0.2s ease;
          margin-bottom: 14px;
        }
        .m4-fb-success { background: #f0faf2; border: 1px solid #b4dec0; color: #1e6030; }
        .m4-fb-error   { background: #fff5f5; border: 1px solid #f8c0c0; border-left: 3px solid #e05252; color: #b91c1c; }

        .m4-overlay {
          position: fixed; inset: 0; background: rgba(0,0,0,0.35);
          z-index: 100; display: flex; justify-content: center; align-items: center;
        }
        .m4-modal {
          background: #fff; border-radius: 12px; width: 900px; max-width: 95vw;
          max-height: 85vh; overflow-y: auto; box-shadow: 0 10px 40px rgba(0,0,0,0.15);
          border: 1px solid #dbe8d5;
        }
        .m4-modal-header {
          display: flex; align-items: center; justify-content: space-between;
          padding: 14px 20px; border-bottom: 1px solid #edf5e8; background: #fafcf9;
          position: sticky; top: 0; z-index: 1;
        }
        .m4-modal-title { font-size: 13px; font-weight: 600; color: #2a4a35; text-transform: uppercase; letter-spacing: 0.6px; }
        .m4-modal-body { padding: 18px 20px; }

        .m4-footer {
          background: #fff; border-top: 1px solid #dbe8d5;
          padding: 8px 20px; display: flex; align-items: center;
          justify-content: space-between; flex-shrink: 0;
        }
        .m4-footer-left { display: flex; align-items: center; gap: 20px; }
        .m4-footer-stat { display: flex; align-items: center; gap: 6px; font-size: 11.5px; color: #6a8a74; }
        .m4-footer-stat strong { color: #1a2e22; font-weight: 600; }

        @keyframes m4-spin { to { transform: rotate(360deg); } }
        .m4-spinner {
          width: 14px; height: 14px; flex-shrink: 0;
          border: 2px solid rgba(223,240,226,0.3); border-top-color: #dff0e2;
          border-radius: 50%; animation: m4-spin 0.65s linear infinite;
        }
        @keyframes m4FadeIn { from { opacity: 0; transform: translateY(-4px); } to { opacity: 1; transform: translateY(0); } }
      `}</style>

      <div className="m4-root">

        <header className="m4-topbar">
          <div className="m4-topbar-left">
            <div className="m4-logo-mark">
              <svg width="15" height="15" viewBox="0 0 18 18" fill="none">
                <rect x="1.5" y="1.5" width="6" height="6" rx="1.2" fill="rgba(255,255,255,0.9)" />
                <rect x="10.5" y="1.5" width="6" height="6" rx="1.2" fill="rgba(255,255,255,0.4)" />
                <rect x="1.5" y="10.5" width="6" height="6" rx="1.2" fill="rgba(255,255,255,0.4)" />
                <rect x="10.5" y="10.5" width="6" height="6" rx="1.2" fill="rgba(255,255,255,0.7)" />
              </svg>
            </div>
            <span className="m4-app-name">
              Venture<span className="m4-app-sub">ERP &amp; Soluções</span>
            </span>
            <span className="m4-screen-title">VMAN0401 — Consulta Ordens de Serviço</span>
          </div>
        </header>

        <div className="m4-actionbar">
          <div className="m4-action-group">
            <span className="m4-action-label">Consulta</span>
            <button
              className="m4-btn m4-bt-p"
              onClick={handleConsultar}
              disabled={isSearching}
            >
              {isSearching
                ? <><div className="m4-spinner" />Consultando...</>
                : <>
                    <svg width="13" height="13" viewBox="0 0 16 16" fill="none">
                      <circle cx="6.5" cy="6.5" r="4.5" stroke="currentColor" strokeWidth="1.4" />
                      <path d="M10 10l3.5 3.5" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" />
                    </svg>
                    Consultar
                  </>
              }
            </button>
          </div>
          <div className="m4-action-group">
            <button
              className="m4-btn m4-bt-d"
              onClick={handleLimpar}
              disabled={isSearching}
            >
              <svg width="13" height="13" viewBox="0 0 16 16" fill="none">
                <path d="M3 3l10 10M13 3L3 13" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
              </svg>
              Limpar
            </button>
          </div>
        </div>

        <div className="m4-body">

          {feedback && (
            <div className={`m4-feedback ${feedback.type === "success" ? "m4-fb-success" : "m4-fb-error"}`}>
              <svg width="15" height="15" viewBox="0 0 16 16" fill="none">
                {feedback.type === "success"
                  ? <path d="M3 8l3.5 3.5L13 5" stroke="#1e6030" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
                  : <><circle cx="8" cy="8" r="6" stroke="#e05252" strokeWidth="1.4" /><path d="M8 5v3.5M8 10.5h.01" stroke="#e05252" strokeWidth="1.4" strokeLinecap="round" /></>
                }
              </svg>
              {feedback.message}
            </div>
          )}

          <div className="m4-section-banner">
            <span className="m4-section-pill">1 — Filtros de Consulta</span>
            <div className="m4-section-line" />
            <span className="m4-section-hint">Preencha os filtros e clique em Consultar</span>
          </div>

          <div className="m4-card">
            <div className="m4-card-header">
              <div className="m4-card-header-left">
                <svg width="14" height="14" viewBox="0 0 16 16" fill="none">
                  <circle cx="6.5" cy="6.5" r="4.5" stroke="#3e9654" strokeWidth="1.4" />
                  <path d="M10 10l3.5 3.5" stroke="#3e9654" strokeWidth="1.4" strokeLinecap="round" />
                </svg>
                <span className="m4-card-title">Filtros de Consulta</span>
              </div>
            </div>

            <div className="m4-card-body">
              <div className="m4-section-label">Identificação</div>
              <div className="m4-grid">
                <div className="m4-field m4-g2">
                  <label className="m4-label">Plano</label>
                  <input className="m4-input" value={filtros.plano} onChange={e => setFilter("plano", e.target.value)} disabled={!filtros.planejadas} />
                </div>
                <div className="m4-field m4-g2">
                  <label className="m4-label">Ordem Início</label>
                  <input className="m4-input" value={filtros.ordemInicio} onChange={e => setFilter("ordemInicio", e.target.value)} />
                </div>
                <div className="m4-field m4-g2">
                  <label className="m4-label">Ordem Fim</label>
                  <input className="m4-input" value={filtros.ordemFim} onChange={e => setFilter("ordemFim", e.target.value)} />
                </div>
                <div className="m4-field m4-g3">
                  <label className="m4-label">Solicitante</label>
                  <input className="m4-input" value={filtros.solicitante} onChange={e => setFilter("solicitante", e.target.value)} />
                </div>
                <div className="m4-field m4-g3">
                  <label className="m4-label">Serviços</label>
                  <input className="m4-input" value={filtros.servicos} onChange={e => setFilter("servicos", e.target.value)} />
                </div>
              </div>

              <div className="m4-section-sep" />

              <div className="m4-section-label">Datas</div>
              <div className="m4-grid">
                <div className="m4-field m4-g3">
                  <label className="m4-label">Dt. Solicitação Início</label>
                  <input type="date" className="m4-input" value={filtros.dtSolicitacaoInicio} onChange={e => setFilter("dtSolicitacaoInicio", e.target.value)} />
                </div>
                <div className="m4-field m4-g3">
                  <label className="m4-label">Dt. Solicitação Fim</label>
                  <input type="date" className="m4-input" value={filtros.dtSolicitacaoFim} onChange={e => setFilter("dtSolicitacaoFim", e.target.value)} />
                </div>
                <div className="m4-field m4-g3">
                  <label className="m4-label">Dt. Fechamento Início</label>
                  <input type="date" className="m4-input" value={filtros.dtFechamentoInicio} onChange={e => setFilter("dtFechamentoInicio", e.target.value)} />
                </div>
                <div className="m4-field m4-g3">
                  <label className="m4-label">Dt. Fechamento Fim</label>
                  <input type="date" className="m4-input" value={filtros.dtFechamentoFim} onChange={e => setFilter("dtFechamentoFim", e.target.value)} />
                </div>
              </div>

              <div className="m4-section-sep" />

              <div className="m4-section-label">Recursos e Tipo</div>
              <div className="m4-grid">
                <div className="m4-field m4-g2">
                  <label className="m4-label">Executor</label>
                  <input className="m4-input" value={filtros.executor} onChange={e => setFilter("executor", e.target.value)} />
                </div>
                <div className="m4-field m4-g2">
                  <label className="m4-label">Gr. Recursos</label>
                  <input className="m4-input" value={filtros.grRecurso} onChange={e => setFilter("grRecurso", e.target.value)} />
                </div>
                <div className="m4-field m4-g2">
                  <label className="m4-label">Recurso</label>
                  <input className="m4-input" value={filtros.recurso} onChange={e => setFilter("recurso", e.target.value)} />
                </div>
                <div className="m4-field m4-g2">
                  <label className="m4-label">Tipo</label>
                  <select className="m4-select" value={filtros.tipo} onChange={e => setFilter("tipo", e.target.value)}>
                    <option value="">Todos</option><option>Corretiva</option><option>Preventiva</option><option>Programada</option>
                  </select>
                </div>
              </div>

              <div className="m4-section-sep" />

              <div className="m4-section-label">Situações</div>
              <div style={{display:"flex",gap:16,flexWrap:"wrap"}}>
                <label className="m4-chk-row">
                  <input type="checkbox" className="m4-chk" checked={filtros.planejadas} onChange={e => setFilter("planejadas", e.target.checked)} />
                  Planejadas
                </label>
                <label className="m4-chk-row">
                  <input type="checkbox" className="m4-chk" checked={filtros.liberadas} onChange={e => setFilter("liberadas", e.target.checked)} />
                  Liberadas
                </label>
                <label className="m4-chk-row">
                  <input type="checkbox" className="m4-chk" checked={filtros.firmes} onChange={e => setFilter("firmes", e.target.checked)} />
                  Firmes
                </label>
                <label className="m4-chk-row">
                  <input type="checkbox" className="m4-chk" checked={filtros.encerradas} onChange={e => setFilter("encerradas", e.target.checked)} />
                  Encerradas
                </label>
                <label className="m4-chk-row">
                  <input type="checkbox" className="m4-chk" checked={filtros.executoresOrdem} onChange={e => setFilter("executoresOrdem", e.target.checked)} />
                  Exec. da Ordem
                </label>
                <label className="m4-chk-row">
                  <input type="checkbox" className="m4-chk" checked={filtros.executoresApontamentos} onChange={e => setFilter("executoresApontamentos", e.target.checked)} />
                  Exec. Apontamentos
                </label>
              </div>
            </div>
          </div>

          {hasSearched && (
            <>
              <div className="m4-section-banner">
                <span className="m4-section-pill">2 — Resultados</span>
                <div className="m4-section-line" />
                <span className="m4-section-hint">{rows.length} ordem(ns) encontrada(s)</span>
              </div>

              <div className="m4-card">
                <div className="m4-card-header">
                  <div className="m4-card-header-left">
                    <svg width="14" height="14" viewBox="0 0 16 16" fill="none">
                      <path d="M2 4h12M2 8h12M2 12h8" stroke="#3e9654" strokeWidth="1.4" strokeLinecap="round" />
                    </svg>
                    <span className="m4-card-title">Ordens de Serviço</span>
                  </div>
                  <span className="m4-card-badge">{rows.length} registros</span>
                </div>
                <div className="m4-results-wrap">
                  <table className="m4-results-table">
                    <thead>
                      <tr>
                        <th>Emp.</th><th>Ordem</th><th>Tipo</th><th>Recurso</th>
                        <th>Emissão</th><th>Fechamento</th><th>Solicitante</th>
                        <th>Situação</th><th>Status</th><th>Urgente</th><th>Prevista</th>
                        <th>Tipo Problema</th><th style={{width:170}}>Ações</th>
                      </tr>
                    </thead>
                    <tbody>
                      {rows.map((r, i) => (
                        <tr key={i}>
                          <td>{r.emp}</td>
                          <td style={{fontWeight:600,color:"#1a4a2a"}}>{r.numOrdem}</td>
                          <td>{r.tipo}</td>
                          <td>{r.recursoDesc}</td>
                          <td>{r.emissao}</td>
                          <td style={{color: r.fechamento ? "#243830" : "#96b8a0"}}>{r.fechamento || "—"}</td>
                          <td>{r.solicitante}</td>
                          <td>
                            <span className={`m4-badge ${r.situacao === "Liberada" ? "m4-bd-liberada" : r.situacao === "Firme" ? "m4-bd-firme" : ""}`}>
                              {r.situacao}
                            </span>
                          </td>
                          <td>{r.status}</td>
                          <td>
                            {r.urgente
                              ? <span className="m4-badge m4-bd-urgente">Sim</span>
                              : <span style={{color:"#96b8a0"}}>Não</span>
                            }
                          </td>
                          <td>{r.prevista}</td>
                          <td>{r.tipoProblema}</td>
                          <td>
                            <button className="m4-btn m4-bt-sm m4-bt-g" onClick={() => setShowServicos(r.numOrdem)} style={{marginRight:4}}>
                              Serviços
                            </button>
                            <button className="m4-btn m4-bt-sm m4-bt-g" onClick={() => alert("Itens da ordem")} style={{marginRight:4}}>
                              Itens
                            </button>
                            <button className="m4-btn m4-bt-sm m4-bt-g" onClick={() => alert("Custos da ordem")}>
                              Custos
                            </button>
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

        <footer className="m4-footer">
          <div className="m4-footer-left">
            <div className="m4-footer-stat">
              Ordens: <strong>{rows.length}</strong>
            </div>
            <div className="m4-footer-stat">
              Consulta: <strong>{hasSearched ? "Realizada" : "Pendente"}</strong>
            </div>
          </div>
          <span style={{color:"#b0c8b8",fontSize:11}}>GRUPO VENTURE LTDA</span>
        </footer>

      </div>

      {showServicos && (
        <div className="m4-overlay" onClick={e => { if (e.target === e.currentTarget) setShowServicos(null); }}>
          <div className="m4-modal">
            <div className="m4-modal-header">
              <span className="m4-modal-title">Serviços — Ordem {showServicos}</span>
              <button className="m4-btn m4-bt-sm m4-bt-g" onClick={() => setShowServicos(null)}>
                <svg width="12" height="12" viewBox="0 0 16 16" fill="none">
                  <path d="M3 3l10 10M13 3L3 13" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
                </svg>
                Fechar
              </button>
            </div>
            <div className="m4-modal-body">
              <div className="m4-section-label">Serviços Realizados</div>
              <table className="m4-results-table">
                <thead>
                  <tr>
                    <th>Serviço</th><th>Data Início</th><th>Hora Início</th><th>Data Fim</th>
                    <th>Hora Fim</th><th>Tempo</th><th>UM</th><th>Diagnóstico</th><th>Causa</th><th>Efeito</th>
                  </tr>
                </thead>
                <tbody>
                  {MOCK_SERVICOS.map((s, i) => (
                    <tr key={i}>
                      <td style={{fontWeight:600,color:"#1a4a2a"}}>{s.servico}</td><td>{s.dataInicio}</td><td>{s.horaInicio}</td>
                      <td>{s.dataFim}</td><td>{s.horaFim}</td><td>{s.tempo}</td><td>{s.um}</td>
                      <td>{s.diagnostico}</td><td>{s.causa}</td><td>{s.efeito}</td>
                    </tr>
                  ))}
                </tbody>
              </table>

              <div className="m4-section-sep" />

              <div className="m4-section-label">Itens Utilizados</div>
              <table className="m4-results-table">
                <thead>
                  <tr><th>Item</th><th style={{textAlign:"right"}}>Quantidade</th><th>Observação</th></tr>
                </thead>
                <tbody>
                  {MOCK_ITENS_UTILIZADOS.map((it, i) => (
                    <tr key={i}>
                      <td style={{fontWeight:600,color:"#1a4a2a"}}>{it.item}</td>
                      <td style={{textAlign:"right"}}>{it.quantidade}</td>
                      <td>{it.observacao}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
