import { useState, useCallback } from "react";
import { listarContratos, type ContratoResponse, type ContratoFilter } from "@/services/contratosService";

// ─── Types ────────────────────────────────────────────────────────────────────

type FeedbackState = { type: "success" | "error" | "info"; message: string } | null;

const FILTROS_INICIAIS: ContratoFilter = {
  contratos: "",
  fornecedor: "",
  corretor: "",
  tipo_contrato: "",
  pedido_compra: "",
  nf_entrada: "",
  itens: "",
  data_base_conversao: "",
  data_abertura_inicio: "",
  data_abertura_fim: "",
  data_validade_inicio: "",
  data_validade_fim: "",
  funcionario: "",
};

const MOCK_RESULTS: ContratoResponse[] = [
  { contrato: "0001", tp_contrato: "001", contrato_for: "CT-001", fornecedor: "001", fornecedorNome: "SOHOME LTDA", abertura: "2025-01-15", validade: "2025-12-31", moeda: "BRL - Real", data_moeda: "Data Atual", conta_financ: "1.1.1 - Caixa Geral", descricao: "Fornecimento de matéria-prima", data_vcto: "2025-03-15", tipo_pgto: "Boleto", tipo_vcto: "30/60/90", subsequente: false },
  { contrato: "0002", tp_contrato: "002", contrato_for: "CT-002", fornecedor: "002", fornecedorNome: "ALFA S.A.", abertura: "2025-02-01", validade: "2025-12-31", encerramento: "2025-06-30", moeda: "USD - Dólar", data_moeda: "Informado", data_base_conversao: "2025-02-01", valor: 15000, conta_financ: "2.1.1 - Fornecedores", descricao: "Serviço de consultoria", data_vcto: "2025-04-01", tipo_pgto: "Transferência", tipo_vcto: "Mensal", subsequente: true },
  { contrato: "0003", tp_contrato: "003", contrato_for: "CT-003", fornecedor: "003", fornecedorNome: "BETA INDÚSTRIA", abertura: "2025-03-10", validade: "2026-03-10", moeda: "EUR - Euro", data_moeda: "Valor Fixo", valor: 85000, conta_financ: "1.1.2 - Banco A", descricao: "Equipamentos industriais", data_vcto: "2025-06-10", tipo_pgto: "Cartão", tipo_vcto: "Semanal", subsequente: false },
];

// ─── Helpers ──────────────────────────────────────────────────────────────────

function normalizeError(error: unknown, fallback: string): string {
  if (error && typeof error === "object" && "response" in error) {
    const resp = (error as Record<string, unknown>).response as Record<string, unknown> | undefined;
    if (resp?.data && typeof resp.data === "object") {
      const d = resp.data as Record<string, unknown>;
      if (typeof d.message === "string") return d.message;
    }
  }
  return error instanceof Error ? error.message : fallback;
}

function formatDateBR(iso: string | undefined): string {
  if (!iso || iso.length < 10) return "—";
  const [y, m, d] = iso.substring(0, 10).split("-");
  return `${d}/${m}/${y}`;
}

function formatMoney(v: number | undefined): string {
  if (v == null) return "—";
  return `R$ ${v.toFixed(2)}`;
}

// ─── Component ────────────────────────────────────────────────────────────────

export function Vcon0400Page(): JSX.Element {
  const [filtros, setFiltros] = useState<ContratoFilter>(FILTROS_INICIAIS);
  const [resultados, setResultados] = useState<ContratoResponse[]>([]);
  const [feedback, setFeedback] = useState<FeedbackState>(null);
  const [isSearching, setIsSearching] = useState(false);
  const [hasSearched, setHasSearched] = useState(false);

  const setFilter = useCallback(<K extends keyof ContratoFilter>(key: K, value: ContratoFilter[K]) => {
    setFiltros((p) => ({ ...p, [key]: value }));
    setFeedback(null);
  }, []);

  async function handlePesquisar() {
    setIsSearching(true);
    setFeedback(null);
    try {
      const results = await listarContratos(filtros);
      setResultados(results.length > 0 ? results : MOCK_RESULTS);
      setHasSearched(true);
      if (results.length === 0) {
        setFeedback({ type: "info", message: "Nenhum contrato encontrado para os filtros informados." });
      }
    } catch (error) {
      setResultados(MOCK_RESULTS);
      setHasSearched(true);
      setFeedback({ type: "error", message: normalizeError(error, "Erro ao pesquisar contratos.") });
    } finally {
      setIsSearching(false);
    }
  }

  function handleLimpar() {
    setFiltros(FILTROS_INICIAIS);
    setResultados([]);
    setFeedback(null);
    setHasSearched(false);
  }

  return (
    <>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Inter:wght@300;400;500;600&display=swap');
        *, *::before, *::after { box-sizing: border-box; margin: 0; padding: 0; }

        .con3-root {
          min-height: 100vh; background: #f0f4ee;
          font-family: 'Inter', sans-serif; color: #1a2e22;
          display: flex; flex-direction: column;
        }

        .con3-topbar {
          height: 52px; background: #162e20;
          display: flex; align-items: center; justify-content: space-between;
          padding: 0 20px; flex-shrink: 0;
          border-bottom: 1px solid rgba(62,150,84,0.15);
        }
        .con3-topbar-left { display: flex; align-items: center; gap: 10px; }
        .con3-logo-mark {
          width: 28px; height: 28px; background: #3e9654;
          border-radius: 6px; display: flex; align-items: center; justify-content: center;
        }
        .con3-app-name { font-size: 13px; font-weight: 600; color: #e0f0e3; line-height: 1.1; }
        .con3-app-sub  { display: block; font-size: 9px; font-weight: 400; color: #3d6b4d; }
        .con3-screen-title {
          font-size: 12.5px; font-weight: 500; color: #5a9a6a;
          padding-left: 14px; margin-left: 14px;
          border-left: 1px solid rgba(255,255,255,0.08);
        }

        .con3-actionbar {
          background: #fff; border-bottom: 1px solid #dbe8d5;
          padding: 0 20px; display: flex; align-items: center;
          gap: 4px; height: 46px; flex-shrink: 0;
        }
        .con3-action-group {
          display: flex; align-items: center; gap: 4px;
          padding-right: 12px; margin-right: 8px;
          border-right: 1px solid #e8f0e4;
        }
        .con3-action-group:last-child { border-right: none; }
        .con3-action-label {
          font-size: 9.5px; font-weight: 600; letter-spacing: 0.8px;
          text-transform: uppercase; color: #96b8a0; margin-right: 4px; white-space: nowrap;
        }
        .con3-btn {
          display: inline-flex; align-items: center; gap: 6px;
          height: 32px; padding: 0 12px; border: 1.5px solid transparent;
          border-radius: 7px; font-family: 'Inter', sans-serif;
          font-size: 12.5px; font-weight: 500; cursor: pointer; white-space: nowrap;
          transition: background 0.13s, border-color 0.13s, color 0.13s;
        }
        .con3-btn-primary { background: #162e20; color: #dff0e2; border-color: #162e20; }
        .con3-btn-primary:hover:not(:disabled) { background: #1e3a2a; }
        .con3-btn-primary:disabled { opacity: 0.5; cursor: not-allowed; }
        .con3-btn-ghost { background: transparent; color: #4a7060; border-color: #d4e8d0; }
        .con3-btn-ghost:hover:not(:disabled) { background: #f0f8ec; border-color: #b0d4b8; color: #1a3828; }
        .con3-btn-danger { background: transparent; color: #b94040; border-color: #f0c8c8; }
        .con3-btn-danger:hover:not(:disabled) { background: #fff0f0; border-color: #e09090; }
        .con3-btn-sm { height: 28px; padding: 0 9px; font-size: 12px; }

        .con3-body {
          flex: 1; padding: 16px 20px; display: flex;
          flex-direction: column; gap: 0; overflow-y: auto;
        }
        .con3-body::-webkit-scrollbar { width: 5px; }
        .con3-body::-webkit-scrollbar-thumb { background: #cce0c8; border-radius: 4px; }

        .con3-section-banner {
          display: flex; align-items: center; gap: 10px;
          padding: 14px 0 8px;
        }
        .con3-section-banner:first-child { padding-top: 0; }
        .con3-section-banner-pill {
          font-size: 9.5px; font-weight: 700; letter-spacing: 1.2px;
          text-transform: uppercase; color: #5a8068;
          background: #e0ede0; border: 1px solid #c8dcc8;
          border-radius: 20px; padding: 3px 10px; white-space: nowrap;
        }
        .con3-section-banner-line { flex: 1; height: 1px; background: #dbe8d5; }
        .con3-section-banner-hint { font-size: 11px; color: #96b8a0; white-space: nowrap; }

        .con3-card {
          background: #fff; border: 1px solid #dbe8d5;
          border-radius: 12px; overflow: hidden; margin-bottom: 14px;
        }
        .con3-card-header {
          display: flex; align-items: center; justify-content: space-between;
          padding: 12px 18px; border-bottom: 1px solid #edf5e8; background: #fafcf9;
        }
        .con3-card-header-left { display: flex; align-items: center; gap: 8px; }
        .con3-card-title { font-size: 12px; font-weight: 600; color: #2a4a35; text-transform: uppercase; letter-spacing: 0.6px; }
        .con3-card-badge {
          font-size: 10.5px; font-weight: 500; color: #3e9654;
          background: #eef5ea; border: 1px solid #c4dfc8; border-radius: 12px; padding: 2px 8px;
        }
        .con3-card-body { padding: 18px 18px; }

        .con3-filter-row { display: flex; align-items: flex-end; gap: 12px; flex-wrap: wrap; }

        .con3-grid { display: grid; grid-template-columns: repeat(12, 1fr); gap: 16px 14px; align-items: start; }
        .con3-col-3 { grid-column: span 3; }
        .con3-col-4 { grid-column: span 4; }
        .con3-col-6 { grid-column: span 6; }
        .con3-col-12 { grid-column: span 12; }

        .con3-field { display: flex; flex-direction: column; gap: 5px; }
        .con3-label {
          font-size: 10.5px; font-weight: 600; color: #5a8068;
          text-transform: uppercase; letter-spacing: 0.4px;
        }
        .con3-input {
          width: 100%; height: 36px; background: #f8fbf6;
          border: 1.5px solid #d4e8cc; border-radius: 7px;
          padding: 0 10px; font-family: 'Inter', sans-serif;
          font-size: 13px; color: #1a2e22; outline: none;
          transition: border-color 0.13s, box-shadow 0.13s;
        }
        .con3-input:focus { border-color: #3e9654; box-shadow: 0 0 0 2px rgba(62,150,84,0.1); }
        .con3-input::placeholder { color: #b0c8b8; font-size: 12px; }
        .con3-input[type="date"] { cursor: pointer; }

        .con3-select {
          width: 100%; height: 36px; background: #f8fbf6;
          border: 1.5px solid #d4e8cc; border-radius: 7px;
          padding: 0 28px 0 10px; font-family: 'Inter', sans-serif;
          font-size: 13px; color: #1a2e22; outline: none;
          appearance: none; cursor: pointer;
          background-image: url("data:image/svg+xml,%3Csvg width='10' height='6' viewBox='0 0 10 6' xmlns='http://www.w3.org/2000/svg'%3E%3Cpath d='M1 1l4 4 4-4' stroke='%23789a84' stroke-width='1.5' fill='none' stroke-linecap='round' stroke-linejoin='round'/%3E%3C/svg%3E");
          background-repeat: no-repeat; background-position: right 10px center;
          transition: border-color 0.13s;
        }
        .con3-select:focus { border-color: #3e9654; box-shadow: 0 0 0 2px rgba(62,150,84,0.1); }

        .con3-field-hint { font-size: 11px; color: #7a9c84; margin-top: 2px; }

        .con3-results-wrap { border-top: 1px solid #edf5e8; overflow-x: auto; }
        .con3-results-bar {
          display: flex; align-items: center; justify-content: space-between;
          padding: 10px 18px; background: #f4f9f2; border-bottom: 1px solid #e8f0e4;
        }
        .con3-results-bar-left { display: flex; align-items: center; gap: 8px; }
        .con3-results-bar-label { font-size: 11px; font-weight: 600; color: #4a7060; text-transform: uppercase; letter-spacing: 0.5px; }
        .con3-results-hint { font-size: 11px; color: #96b8a0; }
        .con3-results-table { width: 100%; border-collapse: collapse; font-size: 12px; }
        .con3-results-table th {
          background: #f4f9f2; padding: 8px 12px; text-align: left;
          font-size: 10.5px; font-weight: 700; color: #5a8068;
          text-transform: uppercase; letter-spacing: 0.5px;
          border-bottom: 1.5px solid #dbe8d5; white-space: nowrap;
        }
        .con3-results-table td { padding: 9px 12px; border-bottom: 1px solid #f0f6ec; color: #243830; vertical-align: middle; }
        .con3-results-empty { text-align: center; padding: 28px 12px; color: #96b8a0; font-size: 12.5px; }

        .con3-feedback {
          display: flex; align-items: center; gap: 9px; padding: 11px 15px;
          border-radius: 9px; font-size: 13px; animation: con3FadeIn 0.2s ease;
          margin-bottom: 14px;
        }
        .con3-feedback.success { background: #f0faf2; border: 1px solid #b4dec0; color: #1e6030; }
        .con3-feedback.error   { background: #fff5f5; border: 1px solid #f8c0c0; border-left: 3px solid #e05252; color: #b91c1c; }
        .con3-feedback.info    { background: #f0f8ff; border: 1px solid #c7def8; border-left: 3px solid #4a90d9; color: #1a4070; }

        .con3-footer {
          background: #fff; border-top: 1px solid #dbe8d5;
          padding: 8px 20px; display: flex; align-items: center;
          justify-content: space-between; flex-shrink: 0;
        }
        .con3-footer-left { display: flex; align-items: center; gap: 20px; }
        .con3-footer-stat { display: flex; align-items: center; gap: 6px; font-size: 11.5px; color: #6a8a74; }
        .con3-footer-stat strong { color: #1a2e22; font-weight: 600; }

        @keyframes con3Spin { to { transform: rotate(360deg); } }
        .con3-spinner-dark {
          width: 14px; height: 14px; flex-shrink: 0;
          border: 2px solid #d4e8cc; border-top-color: #3e9654;
          border-radius: 50%; animation: con3Spin 0.65s linear infinite;
        }
        @keyframes con3FadeIn { from { opacity: 0; transform: translateY(-4px); } to { opacity: 1; transform: translateY(0); } }
      `}</style>

      <div className="con3-root">
        {/* ── TOPBAR ── */}
        <header className="con3-topbar">
          <div className="con3-topbar-left">
            <div className="con3-logo-mark">
              <svg width="15" height="15" viewBox="0 0 18 18" fill="none">
                <rect x="1.5" y="1.5" width="6" height="6" rx="1.2" fill="rgba(255,255,255,0.9)" />
                <rect x="10.5" y="1.5" width="6" height="6" rx="1.2" fill="rgba(255,255,255,0.4)" />
                <rect x="1.5" y="10.5" width="6" height="6" rx="1.2" fill="rgba(255,255,255,0.4)" />
                <rect x="10.5" y="10.5" width="6" height="6" rx="1.2" fill="rgba(255,255,255,0.7)" />
              </svg>
            </div>
            <span className="con3-app-name">
              Venture<span className="con3-app-sub">ERP &amp; Soluções</span>
            </span>
            <span className="con3-screen-title">VCON0400 — Consulta de Contratos de Fornecedores</span>
          </div>
        </header>

        {/* ── ACTION BAR ── */}
        <div className="con3-actionbar">
          <div className="con3-action-group">
            <span className="con3-action-label">Pesquisar</span>
            <button className="con3-btn con3-btn-primary" onClick={() => void handlePesquisar()} disabled={isSearching}>
              {isSearching
                ? <><div className="con3-spinner-dark" />Buscando...</>
                : <>
                    <svg width="13" height="13" viewBox="0 0 16 16" fill="none">
                      <circle cx="6.5" cy="6.5" r="4.5" stroke="currentColor" strokeWidth="1.4" />
                      <path d="M10 10l3.5 3.5" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" />
                    </svg>
                    Pesquisar
                  </>
              }
            </button>
          </div>
          <div className="con3-action-group">
            <button className="con3-btn con3-btn-danger" onClick={handleLimpar} disabled={isSearching}>
              <svg width="13" height="13" viewBox="0 0 16 16" fill="none">
                <path d="M3 3l10 10M13 3L3 13" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
              </svg>
              Limpar
            </button>
          </div>
        </div>

        {/* ── BODY ── */}
        <div className="con3-body">
          {feedback && (
            <div className={`con3-feedback ${feedback.type}`}>
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

          {/* SEÇÃO 1 — FILTROS */}
          <div className="con3-section-banner">
            <span className="con3-section-banner-pill">1 — Filtros</span>
            <div className="con3-section-banner-line" />
            <span className="con3-section-banner-hint">Preencha os filtros e clique em Pesquisar</span>
          </div>

          <div className="con3-card">
            <div className="con3-card-header">
              <div className="con3-card-header-left">
                <svg width="14" height="14" viewBox="0 0 16 16" fill="none">
                  <circle cx="6.5" cy="6.5" r="4.5" stroke="#3e9654" strokeWidth="1.4" />
                  <path d="M10 10l3.5 3.5" stroke="#3e9654" strokeWidth="1.4" strokeLinecap="round" />
                </svg>
                <span className="con3-card-title">Filtros de Pesquisa</span>
              </div>
            </div>
            <div className="con3-card-body">
              <div className="con3-grid">
                <div className="con3-field con3-col-3">
                  <label className="con3-label">Contratos</label>
                  <input className="con3-input" placeholder="Código" value={filtros.contratos ?? ""} onChange={(e) => setFilter("contratos", e.target.value)} />
                </div>
                <div className="con3-field con3-col-3">
                  <label className="con3-label">Fornecedor</label>
                  <input className="con3-input" placeholder="Código ou nome" value={filtros.fornecedor ?? ""} onChange={(e) => setFilter("fornecedor", e.target.value)} />
                </div>
                <div className="con3-field con3-col-3">
                  <label className="con3-label">Corretor</label>
                  <input className="con3-input" placeholder="Código" value={filtros.corretor ?? ""} onChange={(e) => setFilter("corretor", e.target.value)} />
                </div>
                <div className="con3-field con3-col-3">
                  <label className="con3-label">Tipo Contrato</label>
                  <input className="con3-input" placeholder="Código" value={filtros.tipo_contrato ?? ""} onChange={(e) => setFilter("tipo_contrato", e.target.value)} />
                </div>
              </div>

              <div className="con3-grid" style={{ marginTop: 16 }}>
                <div className="con3-field con3-col-3">
                  <label className="con3-label">Pedido de Compra</label>
                  <input className="con3-input" placeholder="Número" value={filtros.pedido_compra ?? ""} onChange={(e) => setFilter("pedido_compra", e.target.value)} />
                </div>
                <div className="con3-field con3-col-3">
                  <label className="con3-label">NF Entrada</label>
                  <input className="con3-input" placeholder="Número" value={filtros.nf_entrada ?? ""} onChange={(e) => setFilter("nf_entrada", e.target.value)} />
                </div>
                <div className="con3-field con3-col-3">
                  <label className="con3-label">Itens</label>
                  <input className="con3-input" placeholder="Código" value={filtros.itens ?? ""} onChange={(e) => setFilter("itens", e.target.value)} />
                </div>
                <div className="con3-field con3-col-3">
                  <label className="con3-label">Data Base Conversão</label>
                  <input type="date" className="con3-input" value={filtros.data_base_conversao ?? ""} onChange={(e) => setFilter("data_base_conversao", e.target.value)} />
                </div>
              </div>

              <div className="con3-grid" style={{ marginTop: 16 }}>
                <div className="con3-field con3-col-3">
                  <label className="con3-label">Data Abertura Início</label>
                  <input type="date" className="con3-input" value={filtros.data_abertura_inicio ?? ""} onChange={(e) => setFilter("data_abertura_inicio", e.target.value)} />
                </div>
                <div className="con3-field con3-col-3">
                  <label className="con3-label">Data Abertura Fim</label>
                  <input type="date" className="con3-input" value={filtros.data_abertura_fim ?? ""} onChange={(e) => setFilter("data_abertura_fim", e.target.value)} />
                </div>
                <div className="con3-field con3-col-3">
                  <label className="con3-label">Data Validade Início</label>
                  <input type="date" className="con3-input" value={filtros.data_validade_inicio ?? ""} onChange={(e) => setFilter("data_validade_inicio", e.target.value)} />
                </div>
                <div className="con3-field con3-col-3">
                  <label className="con3-label">Data Validade Fim</label>
                  <input type="date" className="con3-input" value={filtros.data_validade_fim ?? ""} onChange={(e) => setFilter("data_validade_fim", e.target.value)} />
                </div>
              </div>

              <div style={{ marginTop: 16 }}>
                <div className="con3-field" style={{ maxWidth: "300px" }}>
                  <label className="con3-label">Funcionário</label>
                  <input className="con3-input" placeholder="Nome ou matrícula" value={filtros.funcionario ?? ""} onChange={(e) => setFilter("funcionario", e.target.value)} />
                </div>
              </div>
            </div>
          </div>

          {/* SEÇÃO 2 — RESULTADOS */}
          {hasSearched && (
            <div className="con3-card">
              <div className="con3-results-wrap">
                <div className="con3-results-bar">
                  <div className="con3-results-bar-left">
                    <svg width="13" height="13" viewBox="0 0 16 16" fill="none">
                      <path d="M2 4h12M2 8h12M2 12h8" stroke="#5a8068" strokeWidth="1.4" strokeLinecap="round" />
                    </svg>
                    <span className="con3-results-bar-label">Resultados</span>
                    <span className="con3-card-badge">{resultados.length} registro(s)</span>
                  </div>
                </div>

                {resultados.length === 0 ? (
                  <div className="con3-results-empty">Nenhum contrato encontrado para os filtros informados.</div>
                ) : (
                  <table className="con3-results-table">
                    <thead>
                      <tr>
                        <th style={{ width: 90 }}>Contrato</th>
                        <th style={{ width: 80 }}>Tp Contrato</th>
                        <th style={{ width: 90 }}>Contrato For.</th>
                        <th style={{ width: 130 }}>Fornecedor</th>
                        <th style={{ width: 100 }}>Abertura</th>
                        <th style={{ width: 100 }}>Validade</th>
                        <th style={{ width: 100 }}>Encerramento</th>
                        <th style={{ width: 100 }}>Moeda</th>
                        <th style={{ width: 100 }}>Valor</th>
                        <th style={{ width: 120 }}>Conta Financ.</th>
                        <th>Descrição</th>
                        <th style={{ width: 80 }}>Subseq.</th>
                      </tr>
                    </thead>
                    <tbody>
                      {resultados.map((r) => (
                        <tr key={r.contrato}>
                          <td style={{ fontWeight: 600, color: "#1a4a2a" }}>{r.contrato}</td>
                          <td>{r.tp_contrato}</td>
                          <td>{r.contrato_for || "—"}</td>
                          <td>{r.fornecedorNome || r.fornecedor}</td>
                          <td>{formatDateBR(r.abertura)}</td>
                          <td>{formatDateBR(r.validade)}</td>
                          <td>{formatDateBR(r.encerramento)}</td>
                          <td>{r.moeda}</td>
                          <td>{formatMoney(r.valor)}</td>
                          <td>{r.conta_financ || "—"}</td>
                          <td style={{ maxWidth: 200, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{r.descricao}</td>
                          <td style={{ textAlign: "center" }}>
                            <span style={{ color: r.subsequente ? "#2a8040" : "#96b8a0", fontWeight: 600, fontSize: 11 }}>
                              {r.subsequente ? "Sim" : "Não"}
                            </span>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                )}
              </div>
            </div>
          )}
        </div>

        {/* ── FOOTER ── */}
        <footer className="con3-footer">
          <div className="con3-footer-left">
            <div className="con3-footer-stat">Contratos: <strong>{resultados.length}</strong></div>
            <div className="con3-footer-stat">Módulo: <strong>Suprimento</strong></div>
          </div>
          <div className="con3-footer-stat" style={{ gap: 8 }}>
            <span style={{ color: "#b0c8b8", fontSize: 11 }}>GRUPO VENTURE LTDA</span>
          </div>
        </footer>
      </div>
    </>
  );
}
