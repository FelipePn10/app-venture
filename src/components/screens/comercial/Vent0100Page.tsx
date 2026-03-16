import { useState, useCallback } from "react";

// ─── Types ────────────────────────────────────────────────────────────────────

interface FiltrosPedido {
  pedido: string;
  dtEmissaoInicio: string;
  dtEmissaoFim: string;
  cliente: string;
  cliEstatistico: string;
  estabelecimento: string;
  representante: string;
  item: string;
  mascara: string;
  dtEntregaInicio: string;
  dtEntregaFim: string;
  dtEntregaCli: string;
  dtDigitacaoInicio: string;
  dtDigitacaoFim: string;
  ordemCompra: string;
  origem: string;
  tipoCliente: string;
  tipoEstatistico: string;
  tipoCobranca: string;
  valorPedido: string;
  todosItens: boolean;
  somenteEspeciais: boolean;
}

interface PedidoRow {
  emp: string;
  cliente: string;
  pedido: string;
  ordemCompra: string;
  entrega: string;
  emissao: string;
  posicao: string;
  total: string;
  moeda: string;
  condPg: string;
  status: "verde" | "amarelo" | "laranja" | "vermelho";
}

const ORIGENS = ["Todos", "Interno", "Externo", "EDI", "Portal"];
const TIPOS_CLIENTE = ["Código", "Nome", "CNPJ"];
const VALORES_PEDIDO = ["Com ICMS", "Sem ICMS", "Bruto"];
const POSICOES = ["Todos", "Aberto", "Faturado", "Cancelado", "Bloqueado"];

const MOCK_ROWS: PedidoRow[] = [
  {
    emp: "1",
    cliente: "GRUPO SOHOME LTDA",
    pedido: "000123",
    ordemCompra: "OC-4521",
    entrega: "20/06/2025",
    emissao: "01/06/2025",
    posicao: "Aberto",
    total: "R$ 48.200,00",
    moeda: "BRL",
    condPg: "30/60/90",
    status: "verde",
  },
  {
    emp: "1",
    cliente: "CONSTRUTORA ALFA S.A.",
    pedido: "000124",
    ordemCompra: "",
    entrega: "25/06/2025",
    emissao: "02/06/2025",
    posicao: "Bloqueado",
    total: "R$ 12.750,00",
    moeda: "BRL",
    condPg: "30 DDL",
    status: "vermelho",
  },
  {
    emp: "1",
    cliente: "DISTRIBUIDORA BETA LTDA",
    pedido: "000125",
    ordemCompra: "OC-0099",
    entrega: "18/06/2025",
    emissao: "03/06/2025",
    posicao: "Faturado",
    total: "R$ 7.430,00",
    moeda: "BRL",
    condPg: "À Vista",
    status: "amarelo",
  },
  {
    emp: "2",
    cliente: "INDÚSTRIA GAMA ME",
    pedido: "000126",
    ordemCompra: "",
    entrega: "30/06/2025",
    emissao: "04/06/2025",
    posicao: "Aberto",
    total: "R$ 95.000,00",
    moeda: "USD",
    condPg: "60 DDL",
    status: "verde",
  },
  {
    emp: "1",
    cliente: "COMÉRCIO DELTA EIRELI",
    pedido: "000127",
    ordemCompra: "OC-7733",
    entrega: "10/06/2025",
    emissao: "05/06/2025",
    posicao: "Cancelado",
    total: "R$ 3.200,00",
    moeda: "BRL",
    condPg: "15 DDL",
    status: "laranja",
  },
];

const filtrosIniciais: FiltrosPedido = {
  pedido: "",
  dtEmissaoInicio: "",
  dtEmissaoFim: "",
  cliente: "",
  cliEstatistico: "",
  estabelecimento: "",
  representante: "",
  item: "",
  mascara: "",
  dtEntregaInicio: "",
  dtEntregaFim: "",
  dtEntregaCli: "",
  dtDigitacaoInicio: "",
  dtDigitacaoFim: "",
  ordemCompra: "",
  origem: "Todos",
  tipoCliente: "Código",
  tipoEstatistico: "Código",
  tipoCobranca: "Cobrança",
  valorPedido: "Com ICMS",
  todosItens: false,
  somenteEspeciais: false,
};

// ─── Component ────────────────────────────────────────────────────────────────

export function Vent0100Page(): JSX.Element {
  const [filtros, setFiltros] = useState<FiltrosPedido>(filtrosIniciais);
  const [rows, setRows] = useState<PedidoRow[]>([]);
  const [selectedRow, setSelectedRow] = useState<number | null>(null);
  const [isSearching, setIsSearching] = useState(false);
  const [hasSearched, setHasSearched] = useState(false);
  const [currentPage, setCurrentPage] = useState(1);
  const [totalRows] = useState(MOCK_ROWS.length);

  const setField = useCallback(
    <K extends keyof FiltrosPedido>(key: K, value: FiltrosPedido[K]) => {
      setFiltros((prev) => ({ ...prev, [key]: value }));
    },
    [],
  );

  function handleExecutar() {
    setIsSearching(true);
    setSelectedRow(null);
    setTimeout(() => {
      setRows(MOCK_ROWS);
      setHasSearched(true);
      setIsSearching(false);
      setCurrentPage(1);
    }, 600);
  }

  function handleLimpar() {
    setFiltros(filtrosIniciais);
    setRows([]);
    setSelectedRow(null);
    setHasSearched(false);
  }

  const statusColor: Record<PedidoRow["status"], string> = {
    verde: "#22a84a",
    amarelo: "#e8b800",
    laranja: "#e07820",
    vermelho: "#dc3545",
  };

  const posicaoStyle: Record<string, { bg: string; color: string }> = {
    Aberto: { bg: "#e8f5ea", color: "#1a6630" },
    Faturado: { bg: "#e8f0fb", color: "#1a3a80" },
    Cancelado: { bg: "#fdecea", color: "#991c1c" },
    Bloqueado: { bg: "#fff4e5", color: "#8a4500" },
  };

  return (
    <>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Inter:wght@300;400;500;600&display=swap');

        *, *::before, *::after { box-sizing: border-box; margin: 0; padding: 0; }

        .v-root {
          min-height: 100vh;
          background: #f0f4ee;
          font-family: 'Inter', sans-serif;
          color: #1a2e22;
          display: flex;
          flex-direction: column;
        }

        /* ── TOPBAR ── */
        .v-topbar {
          height: 52px;
          background: #162e20;
          display: flex;
          align-items: center;
          justify-content: space-between;
          padding: 0 20px;
          flex-shrink: 0;
          border-bottom: 1px solid rgba(62,150,84,0.15);
        }

        .v-topbar-left { display: flex; align-items: center; gap: 10px; }

        .v-logo-mark {
          width: 28px; height: 28px; background: #3e9654;
          border-radius: 6px; display: flex; align-items: center;
          justify-content: center; flex-shrink: 0;
        }

        .v-app-name { font-size: 13px; font-weight: 600; color: #e0f0e3; line-height: 1.1; }
        .v-app-sub  { display: block; font-size: 9px; font-weight: 400; color: #3d6b4d; }

        .v-screen-title {
          font-size: 12.5px; font-weight: 500; color: #5a9a6a;
          padding-left: 14px; margin-left: 14px;
          border-left: 1px solid rgba(255,255,255,0.08);
        }

        .v-topbar-right { display: flex; align-items: center; gap: 8px; }

        /* ── ACTION BAR ── */
        .v-actionbar {
          background: #fff;
          border-bottom: 1px solid #dbe8d5;
          padding: 0 20px;
          display: flex;
          align-items: center;
          gap: 4px;
          height: 46px;
          flex-shrink: 0;
        }

        .v-action-group {
          display: flex; align-items: center; gap: 2px;
          padding-right: 10px; margin-right: 6px;
          border-right: 1px solid #e8f0e4;
        }
        .v-action-group:last-child { border-right: none; }

        .v-action-label {
          font-size: 9.5px; font-weight: 600; letter-spacing: 0.8px;
          text-transform: uppercase; color: #96b8a0;
          margin-right: 6px; white-space: nowrap;
        }

        .v-btn {
          display: inline-flex; align-items: center; gap: 6px;
          height: 32px; padding: 0 12px;
          border: 1.5px solid transparent; border-radius: 7px;
          font-family: 'Inter', sans-serif; font-size: 12.5px; font-weight: 500;
          cursor: pointer; white-space: nowrap;
          transition: background 0.13s, border-color 0.13s, color 0.13s;
        }

        .v-btn-primary {
          background: #162e20; color: #dff0e2; border-color: #162e20;
        }
        .v-btn-primary:hover { background: #1e3a2a; border-color: #1e3a2a; }
        .v-btn-primary:disabled { opacity: 0.5; cursor: not-allowed; }

        .v-btn-ghost {
          background: transparent; color: #4a7060; border-color: #d4e8d0;
        }
        .v-btn-ghost:hover { background: #f0f8ec; border-color: #b0d4b8; color: #1a3828; }

        .v-btn-danger {
          background: transparent; color: #b94040; border-color: #f0c8c8;
        }
        .v-btn-danger:hover { background: #fff0f0; border-color: #e09090; }

        .v-nav-btn {
          width: 30px; height: 30px; border-radius: 6px;
          display: flex; align-items: center; justify-content: center;
          background: transparent; border: 1.5px solid #d4e8d0;
          cursor: pointer; color: #4a7060;
          transition: background 0.12s, border-color 0.12s;
        }
        .v-nav-btn:hover { background: #edf7ea; border-color: #a0c8a8; }
        .v-nav-btn:disabled { opacity: 0.35; cursor: not-allowed; }

        /* ── BODY ── */
        .v-body {
          flex: 1; display: flex; flex-direction: column;
          padding: 16px 20px; gap: 14px; overflow-y: auto;
        }
        .v-body::-webkit-scrollbar { width: 5px; }
        .v-body::-webkit-scrollbar-track { background: transparent; }
        .v-body::-webkit-scrollbar-thumb { background: #cce0c8; border-radius: 4px; }

        /* ── FILTER CARD ── */
        .v-filter-card {
          background: #fff;
          border: 1px solid #dbe8d5;
          border-radius: 12px;
          overflow: hidden;
        }

        .v-filter-header {
          display: flex; align-items: center; justify-content: space-between;
          padding: 12px 18px;
          border-bottom: 1px solid #edf5e8;
          background: #fafcf9;
        }

        .v-filter-header-left { display: flex; align-items: center; gap: 8px; }

        .v-filter-title {
          font-size: 12px; font-weight: 600; color: #2a4a35;
          text-transform: uppercase; letter-spacing: 0.6px;
        }

        .v-filter-badge {
          font-size: 10.5px; font-weight: 500; color: #3e9654;
          background: #eef5ea; border: 1px solid #c4dfc8;
          border-radius: 12px; padding: 2px 8px;
        }

        .v-filter-body { padding: 16px 18px; }

        /* Filter grid */
        .v-filter-grid {
          display: grid;
          grid-template-columns: repeat(12, 1fr);
          gap: 10px 12px;
          align-items: end;
        }

        .v-col-2  { grid-column: span 2; }
        .v-col-3  { grid-column: span 3; }
        .v-col-4  { grid-column: span 4; }
        .v-col-5  { grid-column: span 5; }
        .v-col-6  { grid-column: span 6; }
        .v-col-8  { grid-column: span 8; }
        .v-col-12 { grid-column: span 12; }

        .v-field { display: flex; flex-direction: column; gap: 4px; }

        .v-label {
          font-size: 10.5px; font-weight: 600; color: #6a8a74;
          text-transform: uppercase; letter-spacing: 0.4px;
          white-space: nowrap;
        }

        .v-input-wrap { position: relative; display: flex; }

        .v-input {
          width: 100%; height: 34px;
          background: #f8fbf6; border: 1.5px solid #d4e8cc;
          border-radius: 7px; padding: 0 10px;
          font-family: 'Inter', sans-serif; font-size: 13px; color: #1a2e22;
          outline: none;
          transition: border-color 0.13s, box-shadow 0.13s;
        }
        .v-input:focus { border-color: #3e9654; box-shadow: 0 0 0 2px rgba(62,150,84,0.1); }
        .v-input::placeholder { color: #b0c8b8; font-size: 12px; }
        .v-input.with-btn { border-radius: 7px 0 0 7px; }

        .v-select {
          width: 100%; height: 34px;
          background: #f8fbf6; border: 1.5px solid #d4e8cc;
          border-radius: 7px; padding: 0 28px 0 10px;
          font-family: 'Inter', sans-serif; font-size: 13px; color: #1a2e22;
          outline: none; appearance: none; cursor: pointer;
          background-image: url("data:image/svg+xml,%3Csvg width='10' height='6' viewBox='0 0 10 6' fill='none' xmlns='http://www.w3.org/2000/svg'%3E%3Cpath d='M1 1l4 4 4-4' stroke='%23789a84' stroke-width='1.5' stroke-linecap='round' stroke-linejoin='round'/%3E%3C/svg%3E");
          background-repeat: no-repeat;
          background-position: right 10px center;
          transition: border-color 0.13s, box-shadow 0.13s;
        }
        .v-select:focus { border-color: #3e9654; box-shadow: 0 0 0 2px rgba(62,150,84,0.1); }

        .v-input-btn {
          height: 34px; width: 34px; flex-shrink: 0;
          background: #edf5ea; border: 1.5px solid #d4e8cc;
          border-left: none; border-radius: 0 7px 7px 0;
          display: flex; align-items: center; justify-content: center;
          cursor: pointer; color: #4a8060;
          transition: background 0.12s;
        }
        .v-input-btn:hover { background: #ddf0e0; }

        .v-input-clear {
          height: 34px; width: 30px; flex-shrink: 0;
          background: #fef0e8; border: 1.5px solid #d4e8cc;
          border-left: none; border-radius: 0 7px 7px 0;
          display: flex; align-items: center; justify-content: center;
          cursor: pointer; color: #a06040;
          transition: background 0.12s;
        }
        .v-input-clear:hover { background: #fde0d0; }

        .v-date-range { display: flex; align-items: center; gap: 0; }
        .v-date-range .v-input { border-radius: 7px 0 0 7px; }
        .v-date-range .v-input:last-child { border-radius: 0 7px 7px 0; border-left: none; }
        .v-date-sep {
          height: 34px; padding: 0 6px;
          background: #edf5ea; border: 1.5px solid #d4e8cc; border-left: none; border-right: none;
          display: flex; align-items: center;
          font-size: 11px; color: #7a9c84; white-space: nowrap;
        }

        /* Checkbox row */
        .v-check-row { display: flex; align-items: center; gap: 16px; padding-top: 4px; }

        .v-check-label {
          display: flex; align-items: center; gap: 7px;
          cursor: pointer; user-select: none;
        }
        .v-checkbox {
          width: 15px; height: 15px; flex-shrink: 0;
          border: 1.5px solid #b0d0b8; border-radius: 4px;
          appearance: none; cursor: pointer; background: #f8fbf6;
          position: relative; transition: background 0.12s, border-color 0.12s;
        }
        .v-checkbox:checked { background: #3e9654; border-color: #3e9654; }
        .v-checkbox:checked::after {
          content: ''; position: absolute;
          left: 4px; top: 1.5px; width: 4px; height: 8px;
          border: 2px solid #fff; border-top: none; border-left: none;
          transform: rotate(45deg);
        }
        .v-check-text { font-size: 12.5px; color: #3a5a45; }

        /* Filter separator */
        .v-filter-sep {
          height: 1px; background: #edf5e8;
          margin: 14px 0;
        }

        /* ── RESULTS CARD ── */
        .v-results-card {
          background: #fff;
          border: 1px solid #dbe8d5;
          border-radius: 12px;
          overflow: hidden;
          flex: 1;
          display: flex;
          flex-direction: column;
          min-height: 0;
        }

        .v-results-header {
          display: flex; align-items: center; justify-content: space-between;
          padding: 11px 18px;
          border-bottom: 1px solid #edf5e8;
          background: #fafcf9;
          flex-shrink: 0;
        }

        .v-results-title {
          font-size: 12px; font-weight: 600; color: #2a4a35;
          text-transform: uppercase; letter-spacing: 0.6px;
          display: flex; align-items: center; gap: 8px;
        }

        .v-results-count {
          font-size: 11px; color: #7a9a84;
          background: #eef5ea; border: 1px solid #c8e0c0;
          border-radius: 10px; padding: 2px 8px; font-weight: 500;
        }

        .v-results-meta { font-size: 11.5px; color: #96b8a0; }

        /* Table */
        .v-table-wrap {
          overflow: auto; flex: 1;
        }
        .v-table-wrap::-webkit-scrollbar { height: 5px; width: 5px; }
        .v-table-wrap::-webkit-scrollbar-track { background: transparent; }
        .v-table-wrap::-webkit-scrollbar-thumb { background: #cce0c8; border-radius: 4px; }

        .v-table {
          width: 100%; border-collapse: collapse;
          font-size: 13px; min-width: 900px;
        }

        .v-table thead { position: sticky; top: 0; z-index: 2; }

        .v-table th {
          background: #f4f9f2;
          padding: 9px 14px;
          text-align: left;
          font-size: 10.5px; font-weight: 700;
          color: #5a8068; text-transform: uppercase; letter-spacing: 0.5px;
          border-bottom: 1.5px solid #dbe8d5;
          white-space: nowrap; user-select: none;
          cursor: pointer;
        }
        .v-table th:hover { background: #edf5e8; color: #2a5040; }

        .v-table td {
          padding: 9px 14px;
          border-bottom: 1px solid #f0f6ec;
          color: #243830;
          white-space: nowrap;
        }

        .v-table tbody tr {
          cursor: pointer;
          transition: background 0.1s;
        }
        .v-table tbody tr:hover { background: #f4fbf2; }
        .v-table tbody tr.selected { background: #e4f5e6 !important; }
        .v-table tbody tr.selected td { color: #1a3828; }

        .v-status-dot {
          width: 9px; height: 9px; border-radius: 50%;
          display: inline-block; flex-shrink: 0;
        }

        .v-posicao-tag {
          display: inline-flex; align-items: center;
          padding: 2px 8px; border-radius: 10px;
          font-size: 11px; font-weight: 600; white-space: nowrap;
        }

        /* Empty state */
        .v-empty {
          display: flex; flex-direction: column; align-items: center; justify-content: center;
          padding: 48px 20px; gap: 10px; color: #96b8a0;
        }
        .v-empty-icon { opacity: 0.35; margin-bottom: 4px; }
        .v-empty-title { font-size: 14px; font-weight: 500; color: #6a8a74; }
        .v-empty-sub { font-size: 12.5px; }

        /* ── FOOTER ── */
        .v-footer {
          background: #fff;
          border-top: 1px solid #dbe8d5;
          padding: 8px 20px;
          display: flex; align-items: center; justify-content: space-between;
          flex-shrink: 0;
        }

        .v-footer-left { display: flex; align-items: center; gap: 20px; }

        .v-footer-stat {
          display: flex; align-items: center; gap: 6px;
          font-size: 11.5px; color: #6a8a74;
        }
        .v-footer-stat strong { color: #1a2e22; font-weight: 600; }

        .v-legend { display: flex; align-items: center; gap: 12px; }
        .v-legend-title { font-size: 10.5px; font-weight: 600; color: #96b8a0; text-transform: uppercase; letter-spacing: 0.5px; }
        .v-legend-item { display: flex; align-items: center; gap: 5px; font-size: 11px; color: #6a8a74; }

        .v-pagination { display: flex; align-items: center; gap: 4px; }
        .v-page-btn {
          width: 28px; height: 28px; border-radius: 6px;
          display: flex; align-items: center; justify-content: center;
          background: transparent; border: 1.5px solid #d4e8d0;
          cursor: pointer; font-size: 12px; color: #4a7060;
          transition: background 0.12s;
        }
        .v-page-btn:hover { background: #edf7ea; }
        .v-page-btn.active { background: #162e20; border-color: #162e20; color: #dff0e2; }
        .v-page-btn:disabled { opacity: 0.3; cursor: not-allowed; }

        /* Spinner */
        @keyframes spin { to { transform: rotate(360deg); } }
        .v-spinner {
          width: 15px; height: 15px;
          border: 2px solid rgba(223,240,226,0.3); border-top-color: #dff0e2;
          border-radius: 50%; animation: spin 0.65s linear infinite;
        }
        .v-spinner-green {
          width: 20px; height: 20px;
          border: 2px solid #d4e8cc; border-top-color: #3e9654;
          border-radius: 50%; animation: spin 0.65s linear infinite;
        }

        @keyframes fadeIn {
          from { opacity: 0; transform: translateY(4px); }
          to   { opacity: 1; transform: translateY(0); }
        }
        .v-animate { animation: fadeIn 0.2s ease; }
      `}</style>

      <div className="v-root">
        {/* TOPBAR */}
        <header className="v-topbar">
          <div className="v-topbar-left">
            <div className="v-logo-mark">
              <svg width="15" height="15" viewBox="0 0 18 18" fill="none">
                <rect
                  x="1.5"
                  y="1.5"
                  width="6"
                  height="6"
                  rx="1.2"
                  fill="rgba(255,255,255,0.9)"
                />
                <rect
                  x="10.5"
                  y="1.5"
                  width="6"
                  height="6"
                  rx="1.2"
                  fill="rgba(255,255,255,0.4)"
                />
                <rect
                  x="1.5"
                  y="10.5"
                  width="6"
                  height="6"
                  rx="1.2"
                  fill="rgba(255,255,255,0.4)"
                />
                <rect
                  x="10.5"
                  y="10.5"
                  width="6"
                  height="6"
                  rx="1.2"
                  fill="rgba(255,255,255,0.7)"
                />
              </svg>
            </div>
            <span className="v-app-name">
              Venture
              <span className="v-app-sub">ERP &amp; Soluções</span>
            </span>
            <span className="v-screen-title">
              VENT0100 — Consulta de Pedidos de Venda
            </span>
          </div>
        </header>

        {/* ACTION BAR */}
        <div className="v-actionbar">
          {/* Navegação */}
          <div className="v-action-group">
            <span className="v-action-label">Nav</span>
            <button
              className="v-nav-btn"
              title="Primeiro"
              disabled={currentPage === 1}
              onClick={() => setCurrentPage(1)}
            >
              <svg width="12" height="12" viewBox="0 0 12 12" fill="none">
                <path
                  d="M9 2L3 6l6 4M2 2v8"
                  stroke="currentColor"
                  strokeWidth="1.5"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                />
              </svg>
            </button>
            <button
              className="v-nav-btn"
              title="Anterior"
              disabled={currentPage === 1}
              onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
            >
              <svg width="12" height="12" viewBox="0 0 12 12" fill="none">
                <path
                  d="M8 2L4 6l4 4"
                  stroke="currentColor"
                  strokeWidth="1.5"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                />
              </svg>
            </button>
            <button
              className="v-nav-btn"
              title="Próximo"
              onClick={() => setCurrentPage((p) => p + 1)}
            >
              <svg width="12" height="12" viewBox="0 0 12 12" fill="none">
                <path
                  d="M4 2l4 4-4 4"
                  stroke="currentColor"
                  strokeWidth="1.5"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                />
              </svg>
            </button>
            <button className="v-nav-btn" title="Último">
              <svg width="12" height="12" viewBox="0 0 12 12" fill="none">
                <path
                  d="M3 2l6 4-6 4M10 2v8"
                  stroke="currentColor"
                  strokeWidth="1.5"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                />
              </svg>
            </button>
          </div>

          {/* Ações */}
          <div className="v-action-group">
            <span className="v-action-label">Ações</span>
            <button
              className="v-btn v-btn-primary"
              onClick={handleExecutar}
              disabled={isSearching}
            >
              {isSearching ? (
                <>
                  <div className="v-spinner" />
                  Buscando...
                </>
              ) : (
                <>
                  <svg width="13" height="13" viewBox="0 0 16 16" fill="none">
                    <circle
                      cx="6.5"
                      cy="6.5"
                      r="4.5"
                      stroke="currentColor"
                      strokeWidth="1.5"
                    />
                    <path
                      d="M10 10l3.5 3.5"
                      stroke="currentColor"
                      strokeWidth="1.5"
                      strokeLinecap="round"
                    />
                  </svg>
                  Executar
                </>
              )}
            </button>
            <button className="v-btn v-btn-danger" onClick={handleLimpar}>
              <svg width="13" height="13" viewBox="0 0 16 16" fill="none">
                <path
                  d="M3 3l10 10M13 3L3 13"
                  stroke="currentColor"
                  strokeWidth="1.5"
                  strokeLinecap="round"
                />
              </svg>
              Limpar
            </button>
            <button className="v-btn v-btn-ghost">
              <svg width="13" height="13" viewBox="0 0 16 16" fill="none">
                <path
                  d="M2 4h12M5 4V2h6v2M6 7v5M10 7v5M3 4l1 9a1 1 0 001 1h6a1 1 0 001-1l1-9"
                  stroke="currentColor"
                  strokeWidth="1.4"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                />
              </svg>
              Apagar
            </button>
            <button className="v-btn v-btn-ghost">
              <svg width="13" height="13" viewBox="0 0 16 16" fill="none">
                <path
                  d="M8 1v10M4 7l4 4 4-4M2 13h12"
                  stroke="currentColor"
                  strokeWidth="1.4"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                />
              </svg>
              Exportar
            </button>
          </div>

          {/* Ferramentas */}
          <div className="v-action-group">
            <span className="v-action-label">Ferramentas</span>
            <button className="v-btn v-btn-ghost">
              <svg width="13" height="13" viewBox="0 0 16 16" fill="none">
                <circle
                  cx="8"
                  cy="8"
                  r="6"
                  stroke="currentColor"
                  strokeWidth="1.4"
                />
                <path
                  d="M8 7v4M8 5.5h.01"
                  stroke="currentColor"
                  strokeWidth="1.4"
                  strokeLinecap="round"
                />
              </svg>
              Ajuda
            </button>
            <button className="v-btn v-btn-ghost">
              <svg width="13" height="13" viewBox="0 0 16 16" fill="none">
                <rect
                  x="2"
                  y="3"
                  width="12"
                  height="10"
                  rx="1.5"
                  stroke="currentColor"
                  strokeWidth="1.4"
                />
                <path
                  d="M5 7h6M5 10h4"
                  stroke="currentColor"
                  strokeWidth="1.4"
                  strokeLinecap="round"
                />
              </svg>
              Documentos
            </button>
            <button className="v-btn v-btn-ghost">
              <svg width="13" height="13" viewBox="0 0 16 16" fill="none">
                <path
                  d="M2 2h5v5H2zM9 2h5v5H9zM2 9h5v5H2zM9 9h5v5H9z"
                  stroke="currentColor"
                  strokeWidth="1.4"
                  strokeLinejoin="round"
                />
              </svg>
              Atalhos
            </button>
          </div>
        </div>

        {/* BODY */}
        <div className="v-body">
          {/* FILTER CARD */}
          <div className="v-filter-card">
            <div className="v-filter-header">
              <div className="v-filter-header-left">
                <svg width="14" height="14" viewBox="0 0 16 16" fill="none">
                  <path
                    d="M2 4h12M5 7h6M7 10h2"
                    stroke="#3e9654"
                    strokeWidth="1.5"
                    strokeLinecap="round"
                  />
                </svg>
                <span className="v-filter-title">Filtros de Consulta</span>
              </div>
              <span className="v-filter-badge">VENT0100</span>
            </div>

            <div className="v-filter-body">
              <div className="v-filter-grid">
                {/* Linha 1 */}
                <div className="v-field v-col-3">
                  <label className="v-label">Pedido</label>
                  <div className="v-input-wrap">
                    <input
                      className="v-input with-btn"
                      value={filtros.pedido}
                      onChange={(e) => setField("pedido", e.target.value)}
                      placeholder="Nº do pedido"
                    />
                    <button className="v-input-btn" title="Buscar pedido">
                      <svg
                        width="13"
                        height="13"
                        viewBox="0 0 16 16"
                        fill="none"
                      >
                        <circle
                          cx="6.5"
                          cy="6.5"
                          r="4.5"
                          stroke="currentColor"
                          strokeWidth="1.4"
                        />
                        <path
                          d="M10 10l3.5 3.5"
                          stroke="currentColor"
                          strokeWidth="1.4"
                          strokeLinecap="round"
                        />
                      </svg>
                    </button>
                  </div>
                </div>

                <div className="v-field v-col-4">
                  <label className="v-label">Dt. Emissão</label>
                  <div className="v-date-range">
                    <input
                      className="v-input"
                      type="date"
                      value={filtros.dtEmissaoInicio}
                      onChange={(e) =>
                        setField("dtEmissaoInicio", e.target.value)
                      }
                    />
                    <div className="v-date-sep">até</div>
                    <input
                      className="v-input"
                      type="date"
                      value={filtros.dtEmissaoFim}
                      onChange={(e) => setField("dtEmissaoFim", e.target.value)}
                    />
                  </div>
                </div>

                <div className="v-field v-col-3">
                  <label className="v-label">Origem</label>
                  <select
                    className="v-select"
                    value={filtros.origem}
                    onChange={(e) => setField("origem", e.target.value)}
                  >
                    {ORIGENS.map((o) => (
                      <option key={o}>{o}</option>
                    ))}
                  </select>
                </div>

                <div className="v-field v-col-2">
                  <label className="v-label">Ordem Compra</label>
                  <input
                    className="v-input"
                    value={filtros.ordemCompra}
                    onChange={(e) => setField("ordemCompra", e.target.value)}
                    placeholder="Nº OC"
                  />
                </div>

                {/* Linha 2 */}
                <div className="v-field v-col-4">
                  <label className="v-label">Cliente(s)</label>
                  <div className="v-input-wrap">
                    <input
                      className="v-input with-btn"
                      value={filtros.cliente}
                      onChange={(e) => setField("cliente", e.target.value)}
                      placeholder="Código ou nome"
                    />
                    <button className="v-input-btn" title="Buscar cliente">
                      <svg
                        width="13"
                        height="13"
                        viewBox="0 0 16 16"
                        fill="none"
                      >
                        <circle
                          cx="6.5"
                          cy="6.5"
                          r="4.5"
                          stroke="currentColor"
                          strokeWidth="1.4"
                        />
                        <path
                          d="M10 10l3.5 3.5"
                          stroke="currentColor"
                          strokeWidth="1.4"
                          strokeLinecap="round"
                        />
                      </svg>
                    </button>
                  </div>
                </div>

                <div className="v-field v-col-3">
                  <label className="v-label">Tipo Cliente</label>
                  <select
                    className="v-select"
                    value={filtros.tipoCliente}
                    onChange={(e) => setField("tipoCliente", e.target.value)}
                  >
                    {TIPOS_CLIENTE.map((t) => (
                      <option key={t}>{t}</option>
                    ))}
                  </select>
                </div>

                <div className="v-field v-col-4">
                  <label className="v-label">Cli. Estatístico(s)</label>
                  <div className="v-input-wrap">
                    <input
                      className="v-input with-btn"
                      value={filtros.cliEstatistico}
                      onChange={(e) =>
                        setField("cliEstatistico", e.target.value)
                      }
                      placeholder="Código"
                    />
                    <button
                      className="v-input-btn"
                      title="Buscar cli. estatístico"
                    >
                      <svg
                        width="13"
                        height="13"
                        viewBox="0 0 16 16"
                        fill="none"
                      >
                        <circle
                          cx="6.5"
                          cy="6.5"
                          r="4.5"
                          stroke="currentColor"
                          strokeWidth="1.4"
                        />
                        <path
                          d="M10 10l3.5 3.5"
                          stroke="currentColor"
                          strokeWidth="1.4"
                          strokeLinecap="round"
                        />
                      </svg>
                    </button>
                  </div>
                </div>

                <div className="v-field v-col-1">
                  <label className="v-label">Tipo</label>
                  <select
                    className="v-select"
                    value={filtros.tipoEstatistico}
                    onChange={(e) =>
                      setField("tipoEstatistico", e.target.value)
                    }
                  >
                    {TIPOS_CLIENTE.map((t) => (
                      <option key={t}>{t}</option>
                    ))}
                  </select>
                </div>

                {/* Linha 3 */}
                <div className="v-field v-col-4">
                  <label className="v-label">Estabelecimento(s)</label>
                  <div className="v-input-wrap">
                    <input
                      className="v-input with-btn"
                      value={filtros.estabelecimento}
                      onChange={(e) =>
                        setField("estabelecimento", e.target.value)
                      }
                      placeholder="Código"
                    />
                    <button
                      className="v-input-btn"
                      title="Buscar estabelecimento"
                    >
                      <svg
                        width="13"
                        height="13"
                        viewBox="0 0 16 16"
                        fill="none"
                      >
                        <circle
                          cx="6.5"
                          cy="6.5"
                          r="4.5"
                          stroke="currentColor"
                          strokeWidth="1.4"
                        />
                        <path
                          d="M10 10l3.5 3.5"
                          stroke="currentColor"
                          strokeWidth="1.4"
                          strokeLinecap="round"
                        />
                      </svg>
                    </button>
                  </div>
                </div>

                <div className="v-field v-col-4">
                  <label className="v-label">Representante(s)</label>
                  <div className="v-input-wrap">
                    <input
                      className="v-input with-btn"
                      value={filtros.representante}
                      onChange={(e) =>
                        setField("representante", e.target.value)
                      }
                      placeholder="Código"
                    />
                    <button
                      className="v-input-btn"
                      title="Buscar representante"
                    >
                      <svg
                        width="13"
                        height="13"
                        viewBox="0 0 16 16"
                        fill="none"
                      >
                        <circle
                          cx="6.5"
                          cy="6.5"
                          r="4.5"
                          stroke="currentColor"
                          strokeWidth="1.4"
                        />
                        <path
                          d="M10 10l3.5 3.5"
                          stroke="currentColor"
                          strokeWidth="1.4"
                          strokeLinecap="round"
                        />
                      </svg>
                    </button>
                  </div>
                </div>

                <div className="v-field v-col-4">
                  <label className="v-label">Item(ns)</label>
                  <div className="v-input-wrap">
                    <input
                      className="v-input with-btn"
                      value={filtros.item}
                      onChange={(e) => setField("item", e.target.value)}
                      placeholder="Código do item"
                    />
                    <button className="v-input-btn" title="Buscar item">
                      <svg
                        width="13"
                        height="13"
                        viewBox="0 0 16 16"
                        fill="none"
                      >
                        <circle
                          cx="6.5"
                          cy="6.5"
                          r="4.5"
                          stroke="currentColor"
                          strokeWidth="1.4"
                        />
                        <path
                          d="M10 10l3.5 3.5"
                          stroke="currentColor"
                          strokeWidth="1.4"
                          strokeLinecap="round"
                        />
                      </svg>
                    </button>
                    <button className="v-input-clear" title="Limpar item">
                      <svg
                        width="10"
                        height="10"
                        viewBox="0 0 10 10"
                        fill="none"
                      >
                        <path
                          d="M1 1l8 8M9 1L1 9"
                          stroke="currentColor"
                          strokeWidth="1.4"
                          strokeLinecap="round"
                        />
                      </svg>
                    </button>
                  </div>
                </div>

                {/* Linha 4 */}
                <div className="v-field v-col-3">
                  <label className="v-label">Máscara</label>
                  <div className="v-input-wrap">
                    <input
                      className="v-input with-btn"
                      value={filtros.mascara}
                      onChange={(e) => setField("mascara", e.target.value)}
                      placeholder="Máscara"
                    />
                    <button className="v-input-btn" title="Buscar máscara">
                      <svg
                        width="13"
                        height="13"
                        viewBox="0 0 16 16"
                        fill="none"
                      >
                        <circle
                          cx="6.5"
                          cy="6.5"
                          r="4.5"
                          stroke="currentColor"
                          strokeWidth="1.4"
                        />
                        <path
                          d="M10 10l3.5 3.5"
                          stroke="currentColor"
                          strokeWidth="1.4"
                          strokeLinecap="round"
                        />
                      </svg>
                    </button>
                  </div>
                </div>

                <div className="v-field v-col-4">
                  <label className="v-label">Dt. Entrega</label>
                  <div className="v-date-range">
                    <input
                      className="v-input"
                      type="date"
                      value={filtros.dtEntregaInicio}
                      onChange={(e) =>
                        setField("dtEntregaInicio", e.target.value)
                      }
                    />
                    <div className="v-date-sep">até</div>
                    <input
                      className="v-input"
                      type="date"
                      value={filtros.dtEntregaFim}
                      onChange={(e) => setField("dtEntregaFim", e.target.value)}
                    />
                  </div>
                </div>

                <div className="v-field v-col-2">
                  <label className="v-label">Dt. Entrega Cli.</label>
                  <input
                    className="v-input"
                    type="date"
                    value={filtros.dtEntregaCli}
                    onChange={(e) => setField("dtEntregaCli", e.target.value)}
                  />
                </div>

                <div className="v-field v-col-3">
                  <label className="v-label">Valor do Pedido</label>
                  <select
                    className="v-select"
                    value={filtros.valorPedido}
                    onChange={(e) => setField("valorPedido", e.target.value)}
                  >
                    {VALORES_PEDIDO.map((v) => (
                      <option key={v}>{v}</option>
                    ))}
                  </select>
                </div>

                {/* Linha 5 */}
                <div className="v-field v-col-4">
                  <label className="v-label">Dt. Digitação</label>
                  <div className="v-date-range">
                    <input
                      className="v-input"
                      type="date"
                      value={filtros.dtDigitacaoInicio}
                      onChange={(e) =>
                        setField("dtDigitacaoInicio", e.target.value)
                      }
                    />
                    <div className="v-date-sep">até</div>
                    <input
                      className="v-input"
                      type="date"
                      value={filtros.dtDigitacaoFim}
                      onChange={(e) =>
                        setField("dtDigitacaoFim", e.target.value)
                      }
                    />
                  </div>
                </div>

                <div className="v-field v-col-3">
                  <label className="v-label">Posição</label>
                  <select className="v-select">
                    {POSICOES.map((p) => (
                      <option key={p}>{p}</option>
                    ))}
                  </select>
                </div>

                <div
                  className="v-field v-col-5"
                  style={{ justifyContent: "flex-end" }}
                >
                  <label className="v-label">&nbsp;</label>
                  <div className="v-check-row">
                    <label className="v-check-label">
                      <input
                        type="checkbox"
                        className="v-checkbox"
                        checked={filtros.todosItens}
                        onChange={(e) =>
                          setField("todosItens", e.target.checked)
                        }
                      />
                      <span className="v-check-text">Todos os Itens</span>
                    </label>
                    <label className="v-check-label">
                      <input
                        type="checkbox"
                        className="v-checkbox"
                        checked={filtros.somenteEspeciais}
                        onChange={(e) =>
                          setField("somenteEspeciais", e.target.checked)
                        }
                      />
                      <span className="v-check-text">Somente Especiais</span>
                    </label>
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* RESULTS CARD */}
          <div className="v-results-card">
            <div className="v-results-header">
              <div className="v-results-title">
                <svg width="13" height="13" viewBox="0 0 16 16" fill="none">
                  <rect
                    x="1"
                    y="3"
                    width="14"
                    height="11"
                    rx="1.5"
                    stroke="#3e9654"
                    strokeWidth="1.4"
                  />
                  <path d="M1 6h14" stroke="#3e9654" strokeWidth="1.4" />
                  <path
                    d="M5 3V1M11 3V1"
                    stroke="#3e9654"
                    strokeWidth="1.4"
                    strokeLinecap="round"
                  />
                </svg>
                Resultado
                {hasSearched && (
                  <span className="v-results-count">
                    {rows.length} registro{rows.length !== 1 ? "s" : ""}
                  </span>
                )}
              </div>
              {selectedRow !== null && (
                <span className="v-results-meta">
                  Linha {selectedRow + 1} selecionada
                </span>
              )}
            </div>

            <div className="v-table-wrap">
              {!hasSearched ? (
                <div className="v-empty">
                  <svg
                    className="v-empty-icon"
                    width="48"
                    height="48"
                    viewBox="0 0 48 48"
                    fill="none"
                  >
                    <circle
                      cx="21"
                      cy="21"
                      r="13"
                      stroke="#3e9654"
                      strokeWidth="2"
                    />
                    <path
                      d="M31 31l9 9"
                      stroke="#3e9654"
                      strokeWidth="2"
                      strokeLinecap="round"
                    />
                    <path
                      d="M17 21h8M21 17v8"
                      stroke="#3e9654"
                      strokeWidth="2"
                      strokeLinecap="round"
                    />
                  </svg>
                  <span className="v-empty-title">
                    Nenhuma consulta realizada
                  </span>
                  <span className="v-empty-sub">
                    Preencha os filtros e clique em <strong>Executar</strong>{" "}
                    para buscar pedidos.
                  </span>
                </div>
              ) : isSearching ? (
                <div className="v-empty">
                  <div className="v-spinner-green" />
                  <span className="v-empty-title">Buscando pedidos...</span>
                </div>
              ) : rows.length === 0 ? (
                <div className="v-empty">
                  <svg
                    className="v-empty-icon"
                    width="48"
                    height="48"
                    viewBox="0 0 48 48"
                    fill="none"
                  >
                    <circle
                      cx="24"
                      cy="24"
                      r="14"
                      stroke="#3e9654"
                      strokeWidth="2"
                    />
                    <path
                      d="M16 24h16"
                      stroke="#3e9654"
                      strokeWidth="2"
                      strokeLinecap="round"
                    />
                  </svg>
                  <span className="v-empty-title">
                    Nenhum pedido encontrado
                  </span>
                  <span className="v-empty-sub">
                    Tente ajustar os filtros e executar novamente.
                  </span>
                </div>
              ) : (
                <table className="v-table v-animate">
                  <thead>
                    <tr>
                      <th style={{ width: 32 }}></th>
                      <th>Emp</th>
                      <th>Cliente / Estabelecimento</th>
                      <th>Pedido</th>
                      <th>Ordem Compra</th>
                      <th>Entrega</th>
                      <th>Emissão</th>
                      <th>Posição</th>
                      <th style={{ textAlign: "right" }}>Total</th>
                      <th>Moeda</th>
                      <th>Cond. Pg</th>
                    </tr>
                  </thead>
                  <tbody>
                    {rows.map((row, i) => (
                      <tr
                        key={i}
                        className={selectedRow === i ? "selected" : ""}
                        onClick={() => setSelectedRow(i)}
                        onDoubleClick={() =>
                          alert(`Abrindo pedido ${row.pedido}...`)
                        }
                      >
                        <td style={{ textAlign: "center" }}>
                          <span
                            className="v-status-dot"
                            style={{ background: statusColor[row.status] }}
                            title={row.status}
                          />
                        </td>
                        <td>{row.emp}</td>
                        <td
                          style={{
                            maxWidth: 220,
                            overflow: "hidden",
                            textOverflow: "ellipsis",
                          }}
                        >
                          {row.cliente}
                        </td>
                        <td
                          style={{
                            fontWeight: 600,
                            color: "#1a4a2a",
                            fontVariantNumeric: "tabular-nums",
                          }}
                        >
                          {row.pedido}
                        </td>
                        <td
                          style={{
                            color: row.ordemCompra ? "#243830" : "#b0c8b8",
                          }}
                        >
                          {row.ordemCompra || "—"}
                        </td>
                        <td>{row.entrega}</td>
                        <td>{row.emissao}</td>
                        <td>
                          <span
                            className="v-posicao-tag"
                            style={{
                              background:
                                posicaoStyle[row.posicao]?.bg ?? "#f0f0f0",
                              color: posicaoStyle[row.posicao]?.color ?? "#333",
                            }}
                          >
                            {row.posicao}
                          </span>
                        </td>
                        <td
                          style={{
                            textAlign: "right",
                            fontWeight: 600,
                            fontVariantNumeric: "tabular-nums",
                          }}
                        >
                          {row.total}
                        </td>
                        <td>{row.moeda}</td>
                        <td>{row.condPg}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              )}
            </div>
          </div>
        </div>

        {/* FOOTER */}
        <footer className="v-footer">
          <div className="v-footer-left">
            <div className="v-footer-stat">
              Registro:{" "}
              <strong>
                {selectedRow !== null
                  ? `${selectedRow + 1}/${totalRows}`
                  : `0/${rows.length}`}
              </strong>
            </div>
            <div className="v-footer-stat">
              Empresa: <strong>1 — GRUPO VENTURE LTDA</strong>
            </div>
            {hasSearched && (
              <div className="v-footer-stat">
                Total registros: <strong>{rows.length}</strong>
              </div>
            )}
          </div>

          <div style={{ display: "flex", alignItems: "center", gap: 20 }}>
            <div className="v-legend">
              <span className="v-legend-title">Legenda</span>
              {[
                { color: "#22a84a", label: "Normal" },
                { color: "#dc3545", label: "Bloqueado" },
                { color: "#e07820", label: "Pendente" },
                { color: "#e8b800", label: "Atenção" },
              ].map(({ color, label }) => (
                <div key={label} className="v-legend-item">
                  <span
                    className="v-status-dot"
                    style={{ background: color }}
                  />
                  {label}
                </div>
              ))}
            </div>

            <div className="v-pagination">
              <button
                className="v-page-btn"
                disabled={currentPage === 1}
                onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
              >
                <svg width="10" height="10" viewBox="0 0 10 10" fill="none">
                  <path
                    d="M7 2L3 5l4 3"
                    stroke="currentColor"
                    strokeWidth="1.5"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                  />
                </svg>
              </button>
              {[1, 2, 3].map((p) => (
                <button
                  key={p}
                  className={`v-page-btn${currentPage === p ? " active" : ""}`}
                  onClick={() => setCurrentPage(p)}
                >
                  {p}
                </button>
              ))}
              <button
                className="v-page-btn"
                onClick={() => setCurrentPage((p) => p + 1)}
              >
                <svg width="10" height="10" viewBox="0 0 10 10" fill="none">
                  <path
                    d="M3 2l4 3-4 3"
                    stroke="currentColor"
                    strokeWidth="1.5"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                  />
                </svg>
              </button>
            </div>
          </div>
        </footer>
      </div>
    </>
  );
}
