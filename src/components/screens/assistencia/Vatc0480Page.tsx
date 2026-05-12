import { useState, useCallback } from "react";

// ─── Types ────────────────────────────────────────────────────────────────────

interface FiltrosConsulta {
  chamados: string;
  tipo_chamado: string;
  data_abertura_inicio: string;
  data_abertura_fim: string;
  grupo: string;
  data_retorno_inicio: string;
  data_retorno_fim: string;
  motivo: string;
  consumidor: string;
  posicao: string;
  responsavel: string;
  situacao: string;
  estado_vistoria: string;
}

interface ChamadoRow {
  empresa: string;
  chamado: string;
  data_abertura: string;
  consumidor: string;
  motivo: string;
  posicao: string;
  responsavel: string;
  data_retorno: string;
  situacao: string;
  data_sol_vistoria: string;
  data_ret_vistoria: string;
}

type FeedbackState = { type: "success" | "error" | "info"; message: string } | null;

// ─── Constants ────────────────────────────────────────────────────────────────

const TIPOS_CHAMADO = ["Garantia", "Fora de Garantia", "Troca", "Conserto", "Revisão", "Recall"];
const GRUPOS = ["Grupo Técnico SP", "Grupo Técnico RJ", "Grupo Técnico MG", "Grupo Técnico PR", "Grupo Técnico RS"];
const MOTIVOS = ["Defeito de Fabricação", "Mau Uso", "Desgaste Natural", "Instalação Incorreta", "Transporte", "Outros"];
const POSICOES = ["Pendente", "Agendamento", "Resolvido"];
const RESPONSAVEIS = ["Técnico A", "Técnico B", "Técnico C", "Supervisor D", "Analista E"];
const SITUACOES = ["Pendente", "Em Análise", "Agendado", "Em Atendimento", "Vistoria", "Concluído", "Cancelado"];
const ESTADOS_VISTORIA = ["Ambas", "Pendentes", "Realizadas"];

const filtrosIniciais: FiltrosConsulta = {
  chamados: "",
  tipo_chamado: "",
  data_abertura_inicio: "",
  data_abertura_fim: "",
  grupo: "",
  data_retorno_inicio: "",
  data_retorno_fim: "",
  motivo: "",
  consumidor: "",
  posicao: "",
  responsavel: "",
  situacao: "",
  estado_vistoria: "Ambas",
};

const MOCK_CHAMADOS: ChamadoRow[] = [
  { empresa: "01 - Matriz", chamado: "000415", data_abertura: "15/05/2026", consumidor: "SOHOME LTDA", motivo: "Defeito de Fabricação", posicao: "Pendente", responsavel: "Técnico A", data_retorno: "—", situacao: "Pendente", data_sol_vistoria: "—", data_ret_vistoria: "—" },
  { empresa: "01 - Matriz", chamado: "000416", data_abertura: "12/05/2026", consumidor: "ALFA S.A.", motivo: "Mau Uso", posicao: "Resolvido", responsavel: "Técnico B", data_retorno: "20/05/2026", situacao: "Concluído", data_sol_vistoria: "—", data_ret_vistoria: "—" },
  { empresa: "02 - Filial SP", chamado: "000417", data_abertura: "10/05/2026", consumidor: "BETA LTDA", motivo: "Desgaste Natural", posicao: "Agendamento", responsavel: "Técnico A", data_retorno: "—", situacao: "Em Atendimento", data_sol_vistoria: "—", data_ret_vistoria: "—" },
  { empresa: "01 - Matriz", chamado: "000418", data_abertura: "08/05/2026", consumidor: "GAMA ME", motivo: "Instalação Incorreta", posicao: "Pendente", responsavel: "Técnico C", data_retorno: "—", situacao: "Vistoria", data_sol_vistoria: "10/05/2026", data_ret_vistoria: "25/05/2026" },
  { empresa: "03 - Filial RJ", chamado: "000419", data_abertura: "05/05/2026", consumidor: "DELTA EIRELI", motivo: "Transporte", posicao: "Agendamento", responsavel: "Técnico B", data_retorno: "15/05/2026", situacao: "Agendado", data_sol_vistoria: "—", data_ret_vistoria: "—" },
  { empresa: "02 - Filial SP", chamado: "000420", data_abertura: "02/05/2026", consumidor: "OMEGA LTDA", motivo: "Defeito de Fabricação", posicao: "Resolvido", responsavel: "Analista E", data_retorno: "18/05/2026", situacao: "Vistoria", data_sol_vistoria: "05/05/2026", data_ret_vistoria: "18/05/2026" },
  { empresa: "01 - Matriz", chamado: "000421", data_abertura: "01/05/2026", consumidor: "SIGMA S.A.", motivo: "Outros", posicao: "Pendente", responsavel: "Supervisor D", data_retorno: "—", situacao: "Pendente", data_sol_vistoria: "—", data_ret_vistoria: "—" },
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

export function Vatc0480Page(): JSX.Element {
  const [filtros, setFiltros] = useState<FiltrosConsulta>(filtrosIniciais);
  const [rows, setRows] = useState<ChamadoRow[]>([]);
  const [feedback, setFeedback] = useState<FeedbackState>(null);
  const [isSearching, setIsSearching] = useState(false);
  const [hasSearched, setHasSearched] = useState(false);

  const setFilter = useCallback(<K extends keyof FiltrosConsulta>(key: K, value: FiltrosConsulta[K]) => {
    setFiltros((prev) => ({ ...prev, [key]: value }));
  }, []);

  const isVistoria = filtros.situacao === "Vistoria";

  async function handleConsultar() {
    setIsSearching(true);
    setFeedback(null);
    try {
      await new Promise((r) => setTimeout(r, 600));

      let filtered = [...MOCK_CHAMADOS];

      if (filtros.chamados.trim())
        filtered = filtered.filter((c) => c.chamado.includes(filtros.chamados.trim()));
      if (filtros.tipo_chamado)
        filtered = filtered.filter((c) => c.situacao.includes(filtros.tipo_chamado) || c.motivo.includes(filtros.tipo_chamado));
      if (filtros.data_abertura_inicio) {
        const ini = filtros.data_abertura_inicio.split("-").reverse().join("/");
        filtered = filtered.filter((c) => c.data_abertura >= ini);
      }
      if (filtros.data_abertura_fim) {
        const fim = filtros.data_abertura_fim.split("-").reverse().join("/");
        filtered = filtered.filter((c) => c.data_abertura <= fim);
      }
      if (filtros.motivo)
        filtered = filtered.filter((c) => c.motivo === filtros.motivo);
      if (filtros.consumidor.trim())
        filtered = filtered.filter((c) =>
          c.consumidor.toUpperCase().includes(filtros.consumidor.trim().toUpperCase()),
        );
      if (filtros.posicao)
        filtered = filtered.filter((c) => c.posicao === filtros.posicao);
      if (filtros.responsavel)
        filtered = filtered.filter((c) => c.responsavel === filtros.responsavel);
      if (filtros.situacao)
        filtered = filtered.filter((c) => c.situacao === filtros.situacao);

      if (filtros.situacao === "Vistoria" && filtros.estado_vistoria !== "Ambas") {
        if (filtros.estado_vistoria === "Pendentes")
          filtered = filtered.filter((c) => c.data_ret_vistoria === "—");
        else if (filtros.estado_vistoria === "Realizadas")
          filtered = filtered.filter((c) => c.data_ret_vistoria !== "—");
      }

      setRows(filtered);
      setHasSearched(true);
      setFeedback({
        type: "success",
        message: `${filtered.length} chamado(s) encontrado(s).`,
      });
    } catch (error) {
      setFeedback({ type: "error", message: normalizeError(error, "Erro na consulta.") });
    } finally {
      setIsSearching(false);
    }
  }

  function handleLimpar() {
    setFiltros(filtrosIniciais);
    setRows([]);
    setFeedback(null);
    setHasSearched(false);
  }

  return (
    <>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Inter:wght@300;400;500;600&display=swap');
        *, *::before, *::after { box-sizing: border-box; margin: 0; padding: 0; }

        .atc-root {
          min-height: 100vh; background: #f0f4ee;
          font-family: 'Inter', sans-serif; color: #1a2e22;
          display: flex; flex-direction: column;
        }

        /* ── TOPBAR ── */
        .atc-topbar {
          height: 52px; background: #162e20;
          display: flex; align-items: center; justify-content: space-between;
          padding: 0 20px; flex-shrink: 0;
          border-bottom: 1px solid rgba(62,150,84,0.15);
        }
        .atc-topbar-left { display: flex; align-items: center; gap: 10px; }
        .atc-logo-mark {
          width: 28px; height: 28px; background: #3e9654;
          border-radius: 6px; display: flex; align-items: center; justify-content: center;
        }
        .atc-app-name { font-size: 13px; font-weight: 600; color: #e0f0e3; line-height: 1.1; }
        .atc-app-sub  { display: block; font-size: 9px; font-weight: 400; color: #3d6b4d; }
        .atc-screen-title {
          font-size: 12.5px; font-weight: 500; color: #5a9a6a;
          padding-left: 14px; margin-left: 14px;
          border-left: 1px solid rgba(255,255,255,0.08);
        }

        /* ── ACTION BAR ── */
        .atc-actionbar {
          background: #fff; border-bottom: 1px solid #dbe8d5;
          padding: 0 20px; display: flex; align-items: center;
          gap: 4px; height: 46px; flex-shrink: 0;
        }
        .atc-action-group {
          display: flex; align-items: center; gap: 4px;
          padding-right: 12px; margin-right: 8px;
          border-right: 1px solid #e8f0e4;
        }
        .atc-action-group:last-child { border-right: none; }
        .atc-action-label {
          font-size: 9.5px; font-weight: 600; letter-spacing: 0.8px;
          text-transform: uppercase; color: #96b8a0; margin-right: 4px; white-space: nowrap;
        }
        .atc-btn {
          display: inline-flex; align-items: center; gap: 6px;
          height: 32px; padding: 0 12px; border: 1.5px solid transparent;
          border-radius: 7px; font-family: 'Inter', sans-serif;
          font-size: 12.5px; font-weight: 500; cursor: pointer; white-space: nowrap;
          transition: background 0.13s, border-color 0.13s, color 0.13s;
        }
        .atc-btn-primary { background: #162e20; color: #dff0e2; border-color: #162e20; }
        .atc-btn-primary:hover:not(:disabled) { background: #1e3a2a; }
        .atc-btn-primary:disabled { opacity: 0.5; cursor: not-allowed; }
        .atc-btn-ghost { background: transparent; color: #4a7060; border-color: #d4e8d0; }
        .atc-btn-ghost:hover:not(:disabled) { background: #f0f8ec; border-color: #b0d4b8; color: #1a3828; }
        .atc-btn-ghost:disabled { opacity: 0.5; cursor: not-allowed; }
        .atc-btn-danger { background: transparent; color: #b94040; border-color: #f0c8c8; }
        .atc-btn-danger:hover:not(:disabled) { background: #fff0f0; border-color: #e09090; }

        /* ── BODY ── */
        .atc-body {
          flex: 1; padding: 16px 20px; display: flex;
          flex-direction: column; gap: 0; overflow-y: auto;
        }
        .atc-body::-webkit-scrollbar { width: 5px; }
        .atc-body::-webkit-scrollbar-thumb { background: #cce0c8; border-radius: 4px; }

        /* ── SECTION BANNER ── */
        .atc-section-banner {
          display: flex; align-items: center; gap: 10px;
          padding: 14px 0 8px;
        }
        .atc-section-banner:first-child { padding-top: 0; }
        .atc-section-banner-pill {
          font-size: 9.5px; font-weight: 700; letter-spacing: 1.2px;
          text-transform: uppercase; color: #5a8068;
          background: #e0ede0; border: 1px solid #c8dcc8;
          border-radius: 20px; padding: 3px 10px; white-space: nowrap;
        }
        .atc-section-banner-line { flex: 1; height: 1px; background: #dbe8d5; }
        .atc-section-banner-hint { font-size: 11px; color: #96b8a0; white-space: nowrap; }

        /* ── CARD ── */
        .atc-card {
          background: #fff; border: 1px solid #dbe8d5;
          border-radius: 12px; overflow: hidden; margin-bottom: 14px;
        }
        .atc-card-header {
          display: flex; align-items: center; justify-content: space-between;
          padding: 12px 18px; border-bottom: 1px solid #edf5e8; background: #fafcf9;
        }
        .atc-card-header-left { display: flex; align-items: center; gap: 8px; }
        .atc-card-title { font-size: 12px; font-weight: 600; color: #2a4a35; text-transform: uppercase; letter-spacing: 0.6px; }
        .atc-card-badge {
          font-size: 10.5px; font-weight: 500; color: #3e9654;
          background: #eef5ea; border: 1px solid #c4dfc8; border-radius: 12px; padding: 2px 8px;
        }
        .atc-card-body { padding: 18px; }

        /* ── GRID ── */
        .atc-grid { display: grid; grid-template-columns: repeat(12, 1fr); gap: 16px 14px; align-items: start; }
        .atc-col-2  { grid-column: span 2; }
        .atc-col-3  { grid-column: span 3; }
        .atc-col-4  { grid-column: span 4; }
        .atc-col-6  { grid-column: span 6; }
        .atc-col-12 { grid-column: span 12; }

        /* ── FIELDS ── */
        .atc-field { display: flex; flex-direction: column; gap: 5px; }
        .atc-label {
          font-size: 10.5px; font-weight: 600; color: #5a8068;
          text-transform: uppercase; letter-spacing: 0.4px;
          display: flex; align-items: center; gap: 4px;
        }
        .atc-input {
          width: 100%; height: 36px; background: #f8fbf6;
          border: 1.5px solid #d4e8cc; border-radius: 7px;
          padding: 0 10px; font-family: 'Inter', sans-serif;
          font-size: 13px; color: #1a2e22; outline: none;
          transition: border-color 0.13s, box-shadow 0.13s;
        }
        .atc-input:focus { border-color: #3e9654; box-shadow: 0 0 0 2px rgba(62,150,84,0.1); }
        .atc-input::placeholder { color: #b0c8b8; font-size: 12px; }
        .atc-input:disabled { background: #f0f4ee; color: #8aaa94; cursor: not-allowed; border-color: #e0ead8; }
        .atc-input[type="date"] { cursor: pointer; }

        .atc-select {
          width: 100%; height: 36px; background: #f8fbf6;
          border: 1.5px solid #d4e8cc; border-radius: 7px;
          padding: 0 28px 0 10px; font-family: 'Inter', sans-serif;
          font-size: 13px; color: #1a2e22; outline: none;
          appearance: none; cursor: pointer;
          background-image: url("data:image/svg+xml,%3Csvg width='10' height='6' viewBox='0 0 10 6' xmlns='http://www.w3.org/2000/svg'%3E%3Cpath d='M1 1l4 4 4-4' stroke='%23789a84' stroke-width='1.5' fill='none' stroke-linecap='round' stroke-linejoin='round'/%3E%3C/svg%3E");
          background-repeat: no-repeat; background-position: right 10px center;
          transition: border-color 0.13s;
        }
        .atc-select:focus { border-color: #3e9654; box-shadow: 0 0 0 2px rgba(62,150,84,0.1); }

        .atc-field-hint { font-size: 11px; color: #7a9c84; margin-top: 2px; line-height: 1.45; }

        /* ── SECTION DIVIDER ── */
        .atc-section-sep { height: 1px; background: #edf5e8; margin: 20px 0; }
        .atc-section-label {
          font-size: 10px; font-weight: 700; letter-spacing: 1px;
          text-transform: uppercase; color: #a0b8a8; margin-bottom: 14px;
          display: flex; align-items: center; gap: 8px;
        }
        .atc-section-label::after { content: ''; flex: 1; height: 1px; background: #e8f0e4; }

        /* ── RESULTS TABLE ── */
        .atc-results-wrap { border-top: 1px solid #edf5e8; overflow-x: auto; }
        .atc-results-bar {
          display: flex; align-items: center; justify-content: space-between;
          padding: 10px 18px; background: #f4f9f2; border-bottom: 1px solid #e8f0e4;
        }
        .atc-results-bar-left { display: flex; align-items: center; gap: 8px; }
        .atc-results-bar-label { font-size: 11px; font-weight: 600; color: #4a7060; text-transform: uppercase; letter-spacing: 0.5px; }
        .atc-results-hint { font-size: 11px; color: #96b8a0; }
        .atc-results-table { width: 100%; border-collapse: collapse; font-size: 12.5px; }
        .atc-results-table th {
          background: #f4f9f2; padding: 8px 10px; text-align: left;
          font-size: 10.5px; font-weight: 700; color: #5a8068;
          text-transform: uppercase; letter-spacing: 0.5px;
          border-bottom: 1.5px solid #dbe8d5; white-space: nowrap;
        }
        .atc-results-table td { padding: 8px 10px; border-bottom: 1px solid #f0f6ec; color: #243830; vertical-align: middle; }
        .atc-results-table tbody tr { transition: background 0.1s; }
        .atc-results-table tbody tr:hover { background: #eef9f0; }
        .atc-results-empty { text-align: center; padding: 28px 12px; color: #96b8a0; font-size: 12.5px; }

        .atc-sit-badge {
          display: inline-flex; align-items: center;
          font-size: 10.5px; font-weight: 600; border-radius: 12px; padding: 2px 8px;
        }
        .atc-sit-badge.pendente       { background: #fff0f0; color: #b91c1c; border: 1px solid #f0c0c0; }
        .atc-sit-badge.andamento      { background: #fff8f0; color: #b96c1c; border: 1px solid #f0d0a0; }
        .atc-sit-badge.concluido      { background: #f0faf2; color: #1e6030; border: 1px solid #b4dec0; }
        .atc-sit-badge.vistoria       { background: #f0f0ff; color: #1c2cb9; border: 1px solid #b0b0f0; }
        .atc-sit-badge.outros-status  { background: #f4f4f4; color: #505050; border: 1px solid #d0d0d0; }

        /* ── FEEDBACK ── */
        .atc-feedback {
          display: flex; align-items: center; gap: 9px; padding: 11px 15px;
          border-radius: 9px; font-size: 13px; animation: atcFadeIn 0.2s ease;
          margin-bottom: 14px;
        }
        .atc-feedback.success { background: #f0faf2; border: 1px solid #b4dec0; color: #1e6030; }
        .atc-feedback.error   { background: #fff5f5; border: 1px solid #f8c0c0; border-left: 3px solid #e05252; color: #b91c1c; }
        .atc-feedback.info    { background: #f0f8ff; border: 1px solid #c7def8; border-left: 3px solid #4a90d9; color: #1a4070; }

        /* ── FOOTER ── */
        .atc-footer {
          background: #fff; border-top: 1px solid #dbe8d5;
          padding: 8px 20px; display: flex; align-items: center;
          justify-content: space-between; flex-shrink: 0;
        }
        .atc-footer-left { display: flex; align-items: center; gap: 20px; }
        .atc-footer-stat { display: flex; align-items: center; gap: 6px; font-size: 11.5px; color: #6a8a74; }
        .atc-footer-stat strong { color: #1a2e22; font-weight: 600; }

        @keyframes spin { to { transform: rotate(360deg); } }
        .atc-spinner {
          width: 14px; height: 14px; flex-shrink: 0;
          border: 2px solid rgba(223,240,226,0.3); border-top-color: #dff0e2;
          border-radius: 50%; animation: spin 0.65s linear infinite;
        }
        .atc-spinner-dark {
          width: 14px; height: 14px; flex-shrink: 0;
          border: 2px solid #d4e8cc; border-top-color: #3e9654;
          border-radius: 50%; animation: spin 0.65s linear infinite;
        }
        @keyframes atcFadeIn { from { opacity: 0; transform: translateY(-4px); } to { opacity: 1; transform: translateY(0); } }
      `}</style>

      <div className="atc-root">

        {/* ── TOPBAR ── */}
        <header className="atc-topbar">
          <div className="atc-topbar-left">
            <div className="atc-logo-mark">
              <svg width="15" height="15" viewBox="0 0 18 18" fill="none">
                <rect x="1.5" y="1.5" width="6" height="6" rx="1.2" fill="rgba(255,255,255,0.9)" />
                <rect x="10.5" y="1.5" width="6" height="6" rx="1.2" fill="rgba(255,255,255,0.4)" />
                <rect x="1.5" y="10.5" width="6" height="6" rx="1.2" fill="rgba(255,255,255,0.4)" />
                <rect x="10.5" y="10.5" width="6" height="6" rx="1.2" fill="rgba(255,255,255,0.7)" />
              </svg>
            </div>
            <span className="atc-app-name">
              Venture<span className="atc-app-sub">ERP &amp; Soluções</span>
            </span>
            <span className="atc-screen-title">VATC0480 — Consulta de Chamados</span>
          </div>
        </header>

        {/* ── ACTION BAR ── */}
        <div className="atc-actionbar">
          <div className="atc-action-group">
            <span className="atc-action-label">Consulta</span>
            <button
              className="atc-btn atc-btn-primary"
              onClick={() => void handleConsultar()}
              disabled={isSearching}
            >
              {isSearching
                ? <><div className="atc-spinner" />Consultando...</>
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

          <div className="atc-action-group">
            <button
              className="atc-btn atc-btn-danger"
              onClick={handleLimpar}
              disabled={isSearching}
            >
              <svg width="13" height="13" viewBox="0 0 16 16" fill="none">
                <path d="M3 3l10 10M13 3L3 13" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
              </svg>
              Limpar
            </button>
          </div>

          <div className="atc-action-group">
            <button className="atc-btn atc-btn-ghost">
              <svg width="13" height="13" viewBox="0 0 16 16" fill="none">
                <circle cx="8" cy="8" r="6" stroke="currentColor" strokeWidth="1.4" />
                <path d="M8 7v4M8 5.5h.01" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" />
              </svg>
              Ajuda
            </button>
          </div>
        </div>

        {/* ── BODY ── */}
        <div className="atc-body">

          {/* Feedback */}
          {feedback && (
            <div className={`atc-feedback ${feedback.type}`}>
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

          {/* ═══════════════════════════════════════════════════════════ */}
          {/* SEÇÃO 1 — FILTROS                                           */}
          {/* ═══════════════════════════════════════════════════════════ */}

          <div className="atc-section-banner">
            <span className="atc-section-banner-pill">1 — Filtros</span>
            <div className="atc-section-banner-line" />
            <span className="atc-section-banner-hint">Preencha os filtros desejados e clique em Consultar</span>
          </div>

          <div className="atc-card">
            <div className="atc-card-header">
              <div className="atc-card-header-left">
                <svg width="14" height="14" viewBox="0 0 16 16" fill="none">
                  <circle cx="6.5" cy="6.5" r="4.5" stroke="#3e9654" strokeWidth="1.4" />
                  <path d="M10 10l3.5 3.5" stroke="#3e9654" strokeWidth="1.4" strokeLinecap="round" />
                </svg>
                <span className="atc-card-title">Filtros de Consulta</span>
              </div>
            </div>

            <div className="atc-card-body">
              {/* Linha 1 */}
              <div className="atc-grid" style={{ marginBottom: 16 }}>
                <div className="atc-field atc-col-2">
                  <label className="atc-label">Chamados</label>
                  <input
                    className="atc-input"
                    placeholder="Nº chamados"
                    value={filtros.chamados}
                    onChange={(e) => setFilter("chamados", e.target.value)}
                    onKeyDown={(e) => e.key === "Enter" && void handleConsultar()}
                  />
                </div>
                <div className="atc-field atc-col-2">
                  <label className="atc-label">Tipo Chamado</label>
                  <select
                    className="atc-select"
                    value={filtros.tipo_chamado}
                    onChange={(e) => setFilter("tipo_chamado", e.target.value)}
                  >
                    <option value="">— Todos —</option>
                    {TIPOS_CHAMADO.map((t) => (
                      <option key={t} value={t}>{t}</option>
                    ))}
                  </select>
                </div>
                <div className="atc-field atc-col-2">
                  <label className="atc-label">Data Abertura Início</label>
                  <input
                    type="date"
                    className="atc-input"
                    value={filtros.data_abertura_inicio}
                    onChange={(e) => setFilter("data_abertura_inicio", e.target.value)}
                  />
                </div>
                <div className="atc-field atc-col-2">
                  <label className="atc-label">Data Abertura Fim</label>
                  <input
                    type="date"
                    className="atc-input"
                    value={filtros.data_abertura_fim}
                    onChange={(e) => setFilter("data_abertura_fim", e.target.value)}
                  />
                </div>
                <div className="atc-field atc-col-2">
                  <label className="atc-label">Grupo</label>
                  <select
                    className="atc-select"
                    value={filtros.grupo}
                    onChange={(e) => setFilter("grupo", e.target.value)}
                  >
                    <option value="">— Todos —</option>
                    {GRUPOS.map((g) => (
                      <option key={g} value={g}>{g}</option>
                    ))}
                  </select>
                </div>
                <div className="atc-field atc-col-2">
                  <label className="atc-label">Data Retorno Início</label>
                  <input
                    type="date"
                    className="atc-input"
                    value={filtros.data_retorno_inicio}
                    onChange={(e) => setFilter("data_retorno_inicio", e.target.value)}
                  />
                </div>
              </div>

              {/* Linha 2 */}
              <div className="atc-grid" style={{ marginBottom: 16 }}>
                <div className="atc-field atc-col-2">
                  <label className="atc-label">Data Retorno Fim</label>
                  <input
                    type="date"
                    className="atc-input"
                    value={filtros.data_retorno_fim}
                    onChange={(e) => setFilter("data_retorno_fim", e.target.value)}
                  />
                </div>
                <div className="atc-field atc-col-2">
                  <label className="atc-label">Motivo</label>
                  <select
                    className="atc-select"
                    value={filtros.motivo}
                    onChange={(e) => setFilter("motivo", e.target.value)}
                  >
                    <option value="">— Todos —</option>
                    {MOTIVOS.map((m) => (
                      <option key={m} value={m}>{m}</option>
                    ))}
                  </select>
                </div>
                <div className="atc-field atc-col-2">
                  <label className="atc-label">Consumidor</label>
                  <input
                    className="atc-input"
                    placeholder="Código ou nome"
                    value={filtros.consumidor}
                    onChange={(e) => setFilter("consumidor", e.target.value)}
                    onKeyDown={(e) => e.key === "Enter" && void handleConsultar()}
                  />
                </div>
                <div className="atc-field atc-col-2">
                  <label className="atc-label">Posição</label>
                  <select
                    className="atc-select"
                    value={filtros.posicao}
                    onChange={(e) => setFilter("posicao", e.target.value)}
                  >
                    <option value="">— Todas —</option>
                    {POSICOES.map((p) => (
                      <option key={p} value={p}>{p}</option>
                    ))}
                  </select>
                </div>
                <div className="atc-field atc-col-2">
                  <label className="atc-label">Responsável</label>
                  <select
                    className="atc-select"
                    value={filtros.responsavel}
                    onChange={(e) => setFilter("responsavel", e.target.value)}
                  >
                    <option value="">— Todos —</option>
                    {RESPONSAVEIS.map((r) => (
                      <option key={r} value={r}>{r}</option>
                    ))}
                  </select>
                </div>
                <div className="atc-field atc-col-2">
                  <label className="atc-label">Situação</label>
                  <select
                    className="atc-select"
                    value={filtros.situacao}
                    onChange={(e) => setFilter("situacao", e.target.value)}
                  >
                    <option value="">— Todas —</option>
                    {SITUACOES.map((s) => (
                      <option key={s} value={s}>{s}</option>
                    ))}
                  </select>
                </div>
              </div>

              {/* Estado Vistoria — visible only when Situação === Vistoria */}
              {isVistoria && (
                <div className="atc-grid">
                  <div className="atc-field atc-col-2">
                    <label className="atc-label">Estado Vistoria</label>
                    <select
                      className="atc-select"
                      value={filtros.estado_vistoria}
                      onChange={(e) => setFilter("estado_vistoria", e.target.value)}
                    >
                      {ESTADOS_VISTORIA.map((ev) => (
                        <option key={ev} value={ev}>{ev}</option>
                      ))}
                    </select>
                  </div>
                </div>
              )}
            </div>
          </div>

          {/* ═══════════════════════════════════════════════════════════ */}
          {/* RESULTADOS                                                   */}
          {/* ═══════════════════════════════════════════════════════════ */}

          {hasSearched && (
            <>
              <div className="atc-section-banner">
                <span className="atc-section-banner-pill">Resultados</span>
                <div className="atc-section-banner-line" />
                <span className="atc-section-banner-hint">{rows.length} chamado(s) encontrado(s)</span>
              </div>

              <div className="atc-card">
                <div className="atc-results-wrap">
                  <div className="atc-results-bar">
                    <div className="atc-results-bar-left">
                      <svg width="13" height="13" viewBox="0 0 16 16" fill="none">
                        <path d="M2 4h12M2 8h12M2 12h8" stroke="#5a8068" strokeWidth="1.4" strokeLinecap="round" />
                      </svg>
                      <span className="atc-results-bar-label">Chamados</span>
                      <span className="atc-card-badge">{rows.length} registro(s)</span>
                    </div>
                  </div>

                  {rows.length === 0 ? (
                    <div className="atc-results-empty">Nenhum chamado encontrado para os filtros informados.</div>
                  ) : (
                    <table className="atc-results-table">
                      <thead>
                        <tr>
                          <th>Empresa</th>
                          <th style={{ width: 90 }}>Chamado</th>
                          <th style={{ width: 110 }}>Data Abertura</th>
                          <th>Consumidor</th>
                          <th>Motivo</th>
                          <th style={{ width: 100 }}>Posição</th>
                          <th>Responsável</th>
                          <th style={{ width: 110 }}>Data Retorno</th>
                          <th style={{ width: 100 }}>Situação</th>
                          <th style={{ width: 110 }}>Data Sol. Vist.</th>
                          <th style={{ width: 110 }}>Data Ret. Vist.</th>
                        </tr>
                      </thead>
                      <tbody>
                        {rows.map((r) => {
                          const sitClass =
                            r.situacao === "Pendente" ? "pendente"
                            : r.situacao === "Vistoria" ? "vistoria"
                            : r.situacao === "Concluído" || r.situacao === "Cancelado" ? "concluido"
                            : "andamento";
                          return (
                            <tr key={r.chamado}>
                              <td>{r.empresa}</td>
                              <td style={{ fontWeight: 600, color: "#1a4a2a" }}>{r.chamado}</td>
                              <td style={{ fontSize: 12 }}>{r.data_abertura}</td>
                              <td>{r.consumidor}</td>
                              <td style={{ fontSize: 12 }}>{r.motivo}</td>
                              <td>{r.posicao}</td>
                              <td style={{ fontSize: 12 }}>{r.responsavel}</td>
                              <td style={{ fontSize: 12, color: r.data_retorno === "—" ? "#96b8a0" : "#243830" }}>
                                {r.data_retorno}
                              </td>
                              <td>
                                <span className={`atc-sit-badge ${sitClass}`}>{r.situacao}</span>
                              </td>
                              <td style={{ fontSize: 12, color: r.data_sol_vistoria === "—" ? "#96b8a0" : "#243830" }}>
                                {r.data_sol_vistoria}
                              </td>
                              <td style={{ fontSize: 12, color: r.data_ret_vistoria === "—" ? "#96b8a0" : "#243830" }}>
                                {r.data_ret_vistoria}
                              </td>
                            </tr>
                          );
                        })}
                      </tbody>
                    </table>
                  )}
                </div>
              </div>
            </>
          )}
        </div>

        {/* ── FOOTER ── */}
        <footer className="atc-footer">
          <div className="atc-footer-left">
            <div className="atc-footer-stat">
              Filtros aplicados: <strong>{[
                filtros.chamados && "Chamados",
                filtros.tipo_chamado && "Tipo",
                filtros.data_abertura_inicio && "Dt.Início",
                filtros.data_abertura_fim && "Dt.Fim",
                filtros.grupo && "Grupo",
                filtros.motivo && "Motivo",
                filtros.consumidor && "Consumidor",
                filtros.posicao && "Posição",
                filtros.responsavel && "Resp.",
                filtros.situacao && "Situação",
                filtros.situacao === "Vistoria" && `Vistoria: ${filtros.estado_vistoria}`,
              ].filter(Boolean).join(", ") || "Nenhum"}</strong>
            </div>
          </div>
          <div className="atc-footer-stat" style={{ gap: 8 }}>
            <span style={{ color: "#b0c8b8", fontSize: 11 }}>Total: {rows.length} registro(s)</span>
            <span style={{ color: "#b0c8b8", fontSize: 11 }}>GRUPO VENTURE LTDA</span>
          </div>
        </footer>

      </div>
    </>
  );
}
