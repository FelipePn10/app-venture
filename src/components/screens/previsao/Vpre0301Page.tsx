import { useState } from "react";

// ─── Types ────────────────────────────────────────────────────────────────────

type FeedbackState = { type: "success" | "error" | "info"; message: string } | null;

interface RelatorioItem {
  item: string;
  descricao: string;
  unidade: string;
  previsto: number;
  realizado: number;
  diferenca: number;
  percentual: number;
}

const DADOS_MOCK: RelatorioItem[] = [
  { item: "10001", descricao: "PRODUTO A - LINHA STANDARD",      unidade: "UN", previsto: 250,  realizado: 238,  diferenca: -12,  percentual: 95.20 },
  { item: "10002", descricao: "PRODUTO B - COMPONENTE X",        unidade: "KG", previsto: 1200, realizado: 1315, diferenca: 115,  percentual: 109.58 },
  { item: "10003", descricao: "PRODUTO C - SUBCONJUNTO",         unidade: "UN", previsto: 80,   realizado: 42,   diferenca: -38,  percentual: 52.50 },
  { item: "10004", descricao: "MATÉRIA-PRIMA D",                 unidade: "MT", previsto: 5400, realizado: 5400, diferenca: 0,    percentual: 100.00 },
  { item: "10005", descricao: "EMBALAGEM E - CAIXA",             unidade: "UN", previsto: 900,  realizado: 870,  diferenca: -30,  percentual: 96.67 },
  { item: "10006", descricao: "COMPONENTE F - PARAFUSO",         unidade: "UN", previsto: 3200, realizado: 0,    diferenca: -3200, percentual: 0.00 },
  { item: "10007", descricao: "CONJUNTO G - MONTAGEM PRINCIPAL", unidade: "UN", previsto: 60,   realizado: 72,   diferenca: 12,   percentual: 120.00 },
];

// ─── Helpers ──────────────────────────────────────────────────────────────────

function fmtNum(n: number, decimais = 0): string {
  return n.toLocaleString("pt-BR", { minimumFractionDigits: decimais, maximumFractionDigits: decimais });
}

function pctColor(pct: number): string {
  if (pct >= 95) return "#1e6030";
  if (pct >= 70) return "#c87000";
  return "#b91c1c";
}

function pctBg(pct: number): string {
  if (pct >= 95) return "#e8f5e0";
  if (pct >= 70) return "#fff8e0";
  return "#fff0f0";
}

function pctBorder(pct: number): string {
  if (pct >= 95) return "#b4d898";
  if (pct >= 70) return "#e0c860";
  return "#f0a8a8";
}

// ─── Component ────────────────────────────────────────────────────────────────

export function Vpre0301Page(): JSX.Element {
  const [periodoIni, setPeriodoIni] = useState("");
  const [periodoFin, setPeriodoFin] = useState("");
  const [empresa, setEmpresa]       = useState("");
  const [filtroItem, setFiltroItem] = useState("");
  const [dados, setDados]           = useState<RelatorioItem[]>([]);
  const [isSearching, setIsSearching] = useState(false);
  const [feedback, setFeedback]     = useState<FeedbackState>(null);
  const [errors, setErrors]         = useState<Record<string, string>>({});
  const [mostrarResultados, setMostrarResultados] = useState(false);
  const [ordenarPor, setOrdenarPor] = useState<keyof RelatorioItem | null>(null);
  const [ordenarDesc, setOrdenarDesc] = useState(false);

  function validate(): boolean {
    const e: Record<string, string> = {};
    if (!periodoIni) e.periodoIni = "Data inicial obrigatória.";
    if (!periodoFin) e.periodoFin = "Data final obrigatória.";
    if (periodoIni && periodoFin && periodoFin < periodoIni) e.periodoFin = "Data final deve ser posterior à inicial.";
    setErrors(e);
    return Object.keys(e).length === 0;
  }

  async function handlePesquisar() {
    if (!validate()) return;
    setIsSearching(true);
    setFeedback(null);
    await new Promise((r) => setTimeout(r, 700));
    const filtrados = filtroItem.trim()
      ? DADOS_MOCK.filter((d) => d.item.includes(filtroItem) || d.descricao.toLowerCase().includes(filtroItem.toLowerCase()))
      : DADOS_MOCK;
    setDados(filtrados);
    setMostrarResultados(true);
    setIsSearching(false);
    if (filtrados.length === 0) {
      setFeedback({ type: "info", message: "Nenhum registro encontrado para os filtros informados." });
    } else {
      setFeedback({ type: "info", message: `${filtrados.length} item(ns) encontrado(s) para o período informado.` });
    }
  }

  function handleLimpar() {
    setPeriodoIni(""); setPeriodoFin(""); setEmpresa(""); setFiltroItem("");
    setDados([]); setMostrarResultados(false); setFeedback(null); setErrors({});
    setOrdenarPor(null);
  }

  function handleOrdenar(col: keyof RelatorioItem) {
    if (ordenarPor === col) setOrdenarDesc((p) => !p);
    else { setOrdenarPor(col); setOrdenarDesc(false); }
  }

  const dadosOrdenados = ordenarPor
    ? [...dados].sort((a, b) => {
        const va = a[ordenarPor];
        const vb = b[ordenarPor];
        if (typeof va === "string" && typeof vb === "string") {
          return ordenarDesc ? vb.localeCompare(va) : va.localeCompare(vb);
        }
        return ordenarDesc ? (vb as number) - (va as number) : (va as number) - (vb as number);
      })
    : dados;

  const totalPrevisto   = dados.reduce((a, d) => a + d.previsto, 0);
  const totalRealizado  = dados.reduce((a, d) => a + d.realizado, 0);
  const totalDiferenca  = totalRealizado - totalPrevisto;
  const pctGeral = totalPrevisto > 0 ? (totalRealizado / totalPrevisto) * 100 : 0;

  // ─── JSX ──────────────────────────────────────────────────────────────────

  return (
    <>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Inter:wght@300;400;500;600&display=swap');
        *, *::before, *::after { box-sizing: border-box; margin: 0; padding: 0; }

        .pre301-root {
          min-height: 100vh; background: #f0f4ee;
          font-family: 'Inter', sans-serif; color: #1a2e22;
          display: flex; flex-direction: column;
        }

        .pre301-topbar {
          height: 52px; background: #162e20;
          display: flex; align-items: center; justify-content: space-between;
          padding: 0 110px 0 20px; flex-shrink: 0;
          border-bottom: 1px solid rgba(62,150,84,0.15);
        }
        .pre301-topbar-left { display: flex; align-items: center; gap: 10px; }
        .pre301-logo-mark {
          width: 28px; height: 28px; background: #3e9654;
          border-radius: 6px; display: flex; align-items: center; justify-content: center;
        }
        .pre301-app-name { font-size: 13px; font-weight: 600; color: #e0f0e3; line-height: 1.1; }
        .pre301-app-sub  { display: block; font-size: 9px; font-weight: 400; color: #3d6b4d; }
        .pre301-screen-title {
          font-size: 12.5px; font-weight: 500; color: #5a9a6a;
          padding-left: 14px; margin-left: 14px;
          border-left: 1px solid rgba(255,255,255,0.08);
        }
        .pre301-screen-badge {
          font-size: 10px; font-weight: 700; letter-spacing: 0.8px;
          background: rgba(62,150,84,0.15); color: #7ecb8f;
          border: 1px solid rgba(62,150,84,0.25); border-radius: 5px;
          padding: 3px 8px;
        }

        .pre301-actionbar {
          background: #fff; border-bottom: 1px solid #dbe8d5;
          padding: 0 20px; display: flex; align-items: center;
          gap: 4px; height: 46px; flex-shrink: 0;
        }
        .pre301-action-group {
          display: flex; align-items: center; gap: 4px;
          padding-right: 12px; margin-right: 8px;
          border-right: 1px solid #e8f0e4;
        }
        .pre301-action-group:last-child { border-right: none; }
        .pre301-action-label {
          font-size: 9.5px; font-weight: 600; letter-spacing: 0.8px;
          text-transform: uppercase; color: #96b8a0; margin-right: 4px; white-space: nowrap;
        }
        .pre301-btn {
          display: inline-flex; align-items: center; gap: 6px;
          height: 32px; padding: 0 12px; border: 1.5px solid transparent;
          border-radius: 7px; font-family: 'Inter', sans-serif;
          font-size: 12.5px; font-weight: 500; cursor: pointer; white-space: nowrap;
          transition: background 0.13s, border-color 0.13s, color 0.13s;
        }
        .pre301-btn-primary { background: #162e20; color: #dff0e2; border-color: #162e20; }
        .pre301-btn-primary:hover:not(:disabled) { background: #1e3a2a; }
        .pre301-btn-primary:disabled { opacity: 0.5; cursor: not-allowed; }
        .pre301-btn-ghost { background: transparent; color: #4a7060; border-color: #d4e8d0; }
        .pre301-btn-ghost:hover:not(:disabled) { background: #f0f8ec; }
        .pre301-btn-print { background: #1a4a8c; color: #dce8ff; border-color: #1a4a8c; }
        .pre301-btn-print:hover:not(:disabled) { background: #1e5aaa; }

        .pre301-body {
          flex: 1; padding: 16px 20px;
          display: flex; flex-direction: column; overflow-y: auto;
        }
        .pre301-body::-webkit-scrollbar { width: 5px; }
        .pre301-body::-webkit-scrollbar-thumb { background: #cce0c8; border-radius: 4px; }

        .pre301-section-banner {
          display: flex; align-items: center; gap: 10px; padding: 14px 0 8px;
        }
        .pre301-section-banner:first-child { padding-top: 0; }
        .pre301-section-banner-pill {
          font-size: 9.5px; font-weight: 700; letter-spacing: 1.2px;
          text-transform: uppercase; color: #5a8068;
          background: #e0ede0; border: 1px solid #c8dcc8;
          border-radius: 20px; padding: 3px 10px; white-space: nowrap;
        }
        .pre301-section-banner-line { flex: 1; height: 1px; background: #dbe8d5; }
        .pre301-section-banner-hint { font-size: 11px; color: #96b8a0; white-space: nowrap; }

        .pre301-card {
          background: #fff; border: 1px solid #dbe8d5;
          border-radius: 12px; overflow: hidden; margin-bottom: 14px;
        }
        .pre301-card-header {
          display: flex; align-items: center; justify-content: space-between;
          padding: 12px 18px; border-bottom: 1px solid #edf5e8; background: #fafcf9;
        }
        .pre301-card-header-left { display: flex; align-items: center; gap: 8px; }
        .pre301-card-title { font-size: 12px; font-weight: 600; color: #2a4a35; text-transform: uppercase; letter-spacing: 0.6px; }
        .pre301-card-body { padding: 18px; }

        .pre301-filter-row { display: flex; align-items: flex-end; gap: 14px; flex-wrap: wrap; }
        .pre301-field { display: flex; flex-direction: column; gap: 5px; }
        .pre301-label {
          font-size: 10.5px; font-weight: 600; color: #5a8068;
          text-transform: uppercase; letter-spacing: 0.4px;
        }
        .pre301-label-req { color: #c84040; font-size: 12px; }
        .pre301-input {
          height: 36px; background: #f8fbf6;
          border: 1.5px solid #d4e8cc; border-radius: 7px;
          padding: 0 10px; font-family: 'Inter', sans-serif;
          font-size: 13px; color: #1a2e22; outline: none;
          transition: border-color 0.13s, box-shadow 0.13s;
        }
        .pre301-input:focus { border-color: #3e9654; box-shadow: 0 0 0 2px rgba(62,150,84,0.1); }
        .pre301-input::placeholder { color: #b0c8b8; font-size: 12px; }
        .pre301-input.has-error { border-color: #e05252; }

        .pre301-field-error { font-size: 11px; color: #c84040; margin-top: 2px; }

        .pre301-feedback {
          display: flex; align-items: center; gap: 9px; padding: 11px 15px;
          border-radius: 9px; font-size: 13px; margin-bottom: 14px;
          animation: pre301FadeIn 0.2s ease;
        }
        .pre301-feedback.success { background: #f0faf2; border: 1px solid #b4dec0; color: #1e6030; }
        .pre301-feedback.error   { background: #fff5f5; border: 1px solid #f8c0c0; border-left: 3px solid #e05252; color: #b91c1c; }
        .pre301-feedback.info    { background: #f0f8ff; border: 1px solid #c7def8; border-left: 3px solid #4a90d9; color: #1a4070; }

        /* ── KPI CARDS ── */
        .pre301-kpi-row {
          display: grid; grid-template-columns: repeat(4, 1fr); gap: 12px; margin-bottom: 14px;
        }
        .pre301-kpi {
          background: #fff; border: 1px solid #dbe8d5; border-radius: 10px;
          padding: 14px 16px; display: flex; flex-direction: column; gap: 4px;
        }
        .pre301-kpi-label { font-size: 10px; font-weight: 700; color: #96b8a0; text-transform: uppercase; letter-spacing: 0.8px; }
        .pre301-kpi-value { font-size: 20px; font-weight: 700; color: #1a2e22; font-variant-numeric: tabular-nums; }
        .pre301-kpi-sub   { font-size: 11px; color: #7a9c84; }

        /* ── TABELA ── */
        .pre301-table-wrap { overflow-x: auto; }
        .pre301-table { width: 100%; border-collapse: collapse; font-size: 13px; }
        .pre301-table th {
          background: #f4f9f2; padding: 8px 12px; text-align: left;
          font-size: 10.5px; font-weight: 700; color: #5a8068;
          text-transform: uppercase; letter-spacing: 0.5px;
          border-bottom: 1.5px solid #dbe8d5; white-space: nowrap;
          cursor: pointer; user-select: none;
        }
        .pre301-table th:hover { background: #ecf5e8; }
        .pre301-table th.num { text-align: right; }
        .pre301-table td { padding: 10px 12px; border-bottom: 1px solid #f0f6ec; color: #243830; vertical-align: middle; }
        .pre301-table td.num { text-align: right; font-variant-numeric: tabular-nums; }
        .pre301-table tbody tr:hover { background: #eef9f0; }
        .pre301-table-empty { text-align: center; padding: 40px 12px; color: #96b8a0; font-size: 12.5px; }
        .pre301-table tfoot td { background: #f0f8f0; font-weight: 700; border-top: 2px solid #c8e4c8; color: #1a3028; padding: 10px 12px; }
        .pre301-table tfoot td.num { text-align: right; font-variant-numeric: tabular-nums; }

        .pre301-pct-badge {
          display: inline-flex; align-items: center;
          font-size: 11.5px; font-weight: 700; padding: 3px 8px;
          border-radius: 12px;
        }

        .pre301-bar-wrap { width: 100px; }
        .pre301-bar-bg {
          height: 6px; background: #e8f0e4; border-radius: 3px; overflow: hidden;
        }
        .pre301-bar-fill {
          height: 100%; border-radius: 3px; transition: width 0.3s;
        }

        .pre301-sort-icon { font-size: 10px; color: #a0b8a0; margin-left: 3px; }

        .pre301-spinner {
          width: 14px; height: 14px; flex-shrink: 0;
          border: 2px solid rgba(223,240,226,0.3); border-top-color: #dff0e2;
          border-radius: 50%; animation: spin301 0.65s linear infinite;
        }
        .pre301-spinner-dark {
          width: 14px; height: 14px; flex-shrink: 0;
          border: 2px solid #d4e8cc; border-top-color: #3e9654;
          border-radius: 50%; animation: spin301 0.65s linear infinite;
        }

        .pre301-footer {
          background: #fff; border-top: 1px solid #dbe8d5;
          padding: 8px 20px; display: flex; align-items: center;
          justify-content: space-between; flex-shrink: 0;
        }
        .pre301-footer-stat { display: flex; align-items: center; gap: 6px; font-size: 11.5px; color: #6a8a74; }
        .pre301-footer-stat strong { color: #1a2e22; font-weight: 600; }

        @keyframes spin301 { to { transform: rotate(360deg); } }
        @keyframes pre301FadeIn { from { opacity: 0; transform: translateY(-4px); } to { opacity: 1; transform: translateY(0); } }
      `}</style>

      <div className="pre301-root">

        {/* ── TOPBAR ── */}
        <header className="pre301-topbar">
          <div className="pre301-topbar-left">
            <div className="pre301-logo-mark">
              <svg width="15" height="15" viewBox="0 0 18 18" fill="none">
                <rect x="1.5" y="1.5"   width="6" height="6" rx="1.2" fill="rgba(255,255,255,0.9)" />
                <rect x="10.5" y="1.5"  width="6" height="6" rx="1.2" fill="rgba(255,255,255,0.4)" />
                <rect x="1.5" y="10.5"  width="6" height="6" rx="1.2" fill="rgba(255,255,255,0.4)" />
                <rect x="10.5" y="10.5" width="6" height="6" rx="1.2" fill="rgba(255,255,255,0.7)" />
              </svg>
            </div>
            <span className="pre301-app-name">
              Venture <span className="pre301-app-sub">ERP &amp; Soluções</span>
            </span>
            <span className="pre301-screen-title">VPRE0301 — Listagem Vendas Previsto X Realizado</span>
          </div>
          <span className="pre301-screen-badge">PLANEJAMENTO</span>
        </header>

        {/* ── ACTION BAR ── */}
        <div className="pre301-actionbar">
          <div className="pre301-action-group">
            <span className="pre301-action-label">Relatório</span>
            <button type="button" className="pre301-btn pre301-btn-primary" onClick={() => void handlePesquisar()} disabled={isSearching}>
              {isSearching ? <span className="pre301-spinner" /> : (
                <svg width="12" height="12" viewBox="0 0 16 16" fill="none">
                  <circle cx="6.5" cy="6.5" r="4.5" stroke="currentColor" strokeWidth="1.5" />
                  <path d="M10 10l3.5 3.5" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
                </svg>
              )}
              Pesquisar
            </button>
            {mostrarResultados && (
              <button type="button" className="pre301-btn pre301-btn-print">
                <svg width="12" height="12" viewBox="0 0 16 16" fill="none">
                  <rect x="2" y="5" width="12" height="8" rx="1.5" stroke="currentColor" strokeWidth="1.4" />
                  <path d="M5 5V3a1 1 0 011-1h4a1 1 0 011 1v2" stroke="currentColor" strokeWidth="1.4" />
                  <path d="M5 9h6M5 12h4" stroke="currentColor" strokeWidth="1.3" strokeLinecap="round" />
                </svg>
                Imprimir
              </button>
            )}
          </div>
          <div className="pre301-action-group">
            <button type="button" className="pre301-btn pre301-btn-ghost" onClick={handleLimpar}>
              <svg width="12" height="12" viewBox="0 0 14 14" fill="none">
                <path d="M2 2l10 10M12 2L2 12" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
              </svg>
              Limpar
            </button>
            <button type="button" className="pre301-btn pre301-btn-ghost">
              <svg width="12" height="12" viewBox="0 0 14 14" fill="none">
                <circle cx="7" cy="7" r="5.5" stroke="currentColor" strokeWidth="1.4" />
                <path d="M7 4.5v3M7 9.5h.01" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" />
              </svg>
              Ajuda
            </button>
          </div>
        </div>

        {/* ── BODY ── */}
        <div className="pre301-body">

          {feedback && (
            <div className={`pre301-feedback ${feedback.type}`}>
              <svg width="15" height="15" viewBox="0 0 16 16" fill="none">
                {feedback.type === "success"
                  ? <path d="M3 8l3.5 3.5L13 5" stroke="#1e6030" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
                  : feedback.type === "error"
                  ? <><circle cx="8" cy="8" r="6" stroke="#e05252" strokeWidth="1.4" /><path d="M8 5v3.5M8 10.5h.01" stroke="#e05252" strokeWidth="1.4" strokeLinecap="round" /></>
                  : <><circle cx="8" cy="8" r="6" stroke="#4a90d9" strokeWidth="1.4" /><path d="M8 5.5v3M8 10h.01" stroke="#4a90d9" strokeWidth="1.4" strokeLinecap="round" /></>
                }
              </svg>
              {feedback.message}
            </div>
          )}

          {/* ── FILTROS ── */}
          <div className="pre301-section-banner">
            <span className="pre301-section-banner-pill">1 — Filtros</span>
            <div className="pre301-section-banner-line" />
            <span className="pre301-section-banner-hint">Período e parâmetros do relatório</span>
          </div>

          <div className="pre301-card">
            <div className="pre301-card-body">
              <div className="pre301-filter-row">
                <div className="pre301-field">
                  <label className="pre301-label">Período Inicial <span className="pre301-label-req">*</span></label>
                  <input className={`pre301-input${errors.periodoIni ? " has-error" : ""}`} style={{ width: 160 }} type="date" value={periodoIni} onChange={(e) => setPeriodoIni(e.target.value)} />
                  {errors.periodoIni && <span className="pre301-field-error">⚠ {errors.periodoIni}</span>}
                </div>
                <div className="pre301-field">
                  <label className="pre301-label">Período Final <span className="pre301-label-req">*</span></label>
                  <input className={`pre301-input${errors.periodoFin ? " has-error" : ""}`} style={{ width: 160 }} type="date" value={periodoFin} onChange={(e) => setPeriodoFin(e.target.value)} />
                  {errors.periodoFin && <span className="pre301-field-error">⚠ {errors.periodoFin}</span>}
                </div>
                <div className="pre301-field">
                  <label className="pre301-label">Empresa</label>
                  <input className="pre301-input" style={{ width: 150 }} type="text" placeholder="Código ou nome..." value={empresa} onChange={(e) => setEmpresa(e.target.value)} />
                </div>
                <div className="pre301-field">
                  <label className="pre301-label">Item</label>
                  <input className="pre301-input" style={{ width: 180 }} type="text" placeholder="Código ou descrição..." value={filtroItem} onChange={(e) => setFiltroItem(e.target.value)} onKeyDown={(e) => e.key === "Enter" && void handlePesquisar()} />
                </div>
                <div className="pre301-field">
                  <label className="pre301-label" style={{ visibility: "hidden" }}>.</label>
                  <button type="button" className="pre301-btn pre301-btn-primary" onClick={() => void handlePesquisar()} disabled={isSearching}>
                    {isSearching ? <span className="pre301-spinner" /> : (
                      <svg width="12" height="12" viewBox="0 0 16 16" fill="none">
                        <circle cx="6.5" cy="6.5" r="4.5" stroke="currentColor" strokeWidth="1.5" />
                        <path d="M10 10l3.5 3.5" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
                      </svg>
                    )}
                    Pesquisar
                  </button>
                </div>
              </div>
            </div>
          </div>

          {/* ── KPIs ── */}
          {mostrarResultados && dados.length > 0 && (
            <>
              <div className="pre301-section-banner">
                <span className="pre301-section-banner-pill">2 — Resumo</span>
                <div className="pre301-section-banner-line" />
              </div>
              <div className="pre301-kpi-row">
                <div className="pre301-kpi">
                  <span className="pre301-kpi-label">Total Previsto</span>
                  <span className="pre301-kpi-value">{fmtNum(totalPrevisto)}</span>
                  <span className="pre301-kpi-sub">{dados.length} itens</span>
                </div>
                <div className="pre301-kpi">
                  <span className="pre301-kpi-label">Total Realizado</span>
                  <span className="pre301-kpi-value">{fmtNum(totalRealizado)}</span>
                  <span className="pre301-kpi-sub">Pedidos de venda</span>
                </div>
                <div className="pre301-kpi">
                  <span className="pre301-kpi-label">Diferença</span>
                  <span className="pre301-kpi-value" style={{ color: totalDiferenca >= 0 ? "#1e6030" : "#b91c1c" }}>
                    {totalDiferenca >= 0 ? "+" : ""}{fmtNum(totalDiferenca)}
                  </span>
                  <span className="pre301-kpi-sub">{totalDiferenca >= 0 ? "Acima do previsto" : "Abaixo do previsto"}</span>
                </div>
                <div className="pre301-kpi">
                  <span className="pre301-kpi-label">% Atingido</span>
                  <span className="pre301-kpi-value" style={{ color: pctColor(pctGeral) }}>{fmtNum(pctGeral, 2)}%</span>
                  <span className="pre301-kpi-sub">{pctGeral >= 100 ? "Meta superada" : pctGeral >= 95 ? "Meta atingida" : "Abaixo da meta"}</span>
                </div>
              </div>
            </>
          )}

          {/* ── RESULTADOS ── */}
          {mostrarResultados && (
            <>
              <div className="pre301-section-banner">
                <span className="pre301-section-banner-pill">3 — Detalhamento</span>
                <div className="pre301-section-banner-line" />
                <span className="pre301-section-banner-hint">Clique no cabeçalho para ordenar</span>
              </div>

              <div className="pre301-card">
                <div className="pre301-card-header">
                  <div className="pre301-card-header-left">
                    <svg width="14" height="14" viewBox="0 0 16 16" fill="none">
                      <path d="M2 4h12M2 8h12M2 12h8" stroke="#3e9654" strokeWidth="1.4" strokeLinecap="round" />
                    </svg>
                    <span className="pre301-card-title">Vendas Previsto X Realizado</span>
                  </div>
                  <button type="button" className="pre301-btn pre301-btn-ghost" style={{ height: 28, fontSize: 12 }} onClick={() => { setMostrarResultados(false); setDados([]); }}>
                    Fechar
                  </button>
                </div>
                <div className="pre301-table-wrap">
                  <table className="pre301-table">
                    <thead>
                      <tr>
                        <th onClick={() => handleOrdenar("item")}>
                          Item <span className="pre301-sort-icon">{ordenarPor === "item" ? (ordenarDesc ? "▼" : "▲") : "⇅"}</span>
                        </th>
                        <th onClick={() => handleOrdenar("descricao")}>
                          Descrição <span className="pre301-sort-icon">{ordenarPor === "descricao" ? (ordenarDesc ? "▼" : "▲") : "⇅"}</span>
                        </th>
                        <th>UN</th>
                        <th className="num" onClick={() => handleOrdenar("previsto")}>
                          Previsto <span className="pre301-sort-icon">{ordenarPor === "previsto" ? (ordenarDesc ? "▼" : "▲") : "⇅"}</span>
                        </th>
                        <th className="num" onClick={() => handleOrdenar("realizado")}>
                          Realizado <span className="pre301-sort-icon">{ordenarPor === "realizado" ? (ordenarDesc ? "▼" : "▲") : "⇅"}</span>
                        </th>
                        <th className="num" onClick={() => handleOrdenar("diferenca")}>
                          Diferença <span className="pre301-sort-icon">{ordenarPor === "diferenca" ? (ordenarDesc ? "▼" : "▲") : "⇅"}</span>
                        </th>
                        <th className="num" onClick={() => handleOrdenar("percentual")}>
                          % Atingido <span className="pre301-sort-icon">{ordenarPor === "percentual" ? (ordenarDesc ? "▼" : "▲") : "⇅"}</span>
                        </th>
                        <th>Barra</th>
                      </tr>
                    </thead>
                    <tbody>
                      {dadosOrdenados.length === 0 ? (
                        <tr>
                          <td colSpan={8} className="pre301-table-empty">
                            Nenhum dado para exibir.
                          </td>
                        </tr>
                      ) : dadosOrdenados.map((d) => (
                        <tr key={d.item}>
                          <td><code style={{ background: "#edf5ea", padding: "2px 6px", borderRadius: 4, fontSize: 12 }}>{d.item}</code></td>
                          <td style={{ color: "#3a5a48" }}>{d.descricao}</td>
                          <td style={{ color: "#7a9c84", fontSize: 12 }}>{d.unidade}</td>
                          <td className="num">{fmtNum(d.previsto)}</td>
                          <td className="num"><strong>{fmtNum(d.realizado)}</strong></td>
                          <td className="num" style={{ color: d.diferenca >= 0 ? "#1e6030" : "#b91c1c", fontWeight: 600 }}>
                            {d.diferenca > 0 ? "+" : ""}{fmtNum(d.diferenca)}
                          </td>
                          <td className="num">
                            <span className="pre301-pct-badge" style={{
                              background: pctBg(d.percentual),
                              color: pctColor(d.percentual),
                              border: `1px solid ${pctBorder(d.percentual)}`,
                            }}>
                              {fmtNum(d.percentual, 2)}%
                            </span>
                          </td>
                          <td>
                            <div className="pre301-bar-wrap">
                              <div className="pre301-bar-bg">
                                <div
                                  className="pre301-bar-fill"
                                  style={{
                                    width: `${Math.min(d.percentual, 100)}%`,
                                    background: d.percentual >= 95 ? "#3e9654" : d.percentual >= 70 ? "#c8a020" : "#e05252",
                                  }}
                                />
                              </div>
                            </div>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                    {dados.length > 0 && (
                      <tfoot>
                        <tr>
                          <td colSpan={3}>Total Geral</td>
                          <td className="num">{fmtNum(totalPrevisto)}</td>
                          <td className="num">{fmtNum(totalRealizado)}</td>
                          <td className="num" style={{ color: totalDiferenca >= 0 ? "#1e6030" : "#b91c1c" }}>
                            {totalDiferenca > 0 ? "+" : ""}{fmtNum(totalDiferenca)}
                          </td>
                          <td className="num">{fmtNum(pctGeral, 2)}%</td>
                          <td></td>
                        </tr>
                      </tfoot>
                    )}
                  </table>
                </div>
              </div>
            </>
          )}
        </div>

        {/* ── FOOTER ── */}
        <footer className="pre301-footer">
          <div style={{ display: "flex", alignItems: "center", gap: 20 }}>
            {mostrarResultados && dados.length > 0 && (
              <>
                <div className="pre301-footer-stat">Registros: <strong>{dados.length}</strong></div>
                <div className="pre301-footer-stat">% Geral: <strong style={{ color: pctColor(pctGeral) }}>{fmtNum(pctGeral, 2)}%</strong></div>
              </>
            )}
          </div>
          <div className="pre301-footer-stat" style={{ color: "#a0b8a8" }}>
            VPRE0301 · Planejamento
          </div>
        </footer>
      </div>
    </>
  );
}
