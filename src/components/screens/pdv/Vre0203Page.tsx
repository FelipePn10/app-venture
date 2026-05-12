import { useState } from "react";

// ─── Types ────────────────────────────────────────────────────────────────────

interface ComissaoMes {
  mes: string;
  valor: number;
}

interface ComissaoProduto {
  produto: string;
  produto_desc: string;
  meses: ComissaoMes[];
}

interface ComissaoVenda {
  venda: string;
  cliente: string;
  produtos: ComissaoProduto[];
}

interface ComissaoRepresentante {
  representante: string;
  representante_nome: string;
  vendas: ComissaoVenda[];
}

type FeedbackState = { type: "success" | "error" | "info"; message: string } | null;

const MOCK_COMISSOES: ComissaoRepresentante[] = [
  {
    representante: "REP001", representante_nome: "João Silva",
    vendas: [
      {
        venda: "000150", cliente: "SOHOME LTDA",
        produtos: [
          { produto: "IT001", produto_desc: "Produto A", meses: [
            { mes: "Jun/26", valor: 250.00 }, { mes: "Jul/26", valor: 250.00 }, { mes: "Ago/26", valor: 250.00 }, { mes: "Set/26", valor: 250.00 },
          ]},
          { produto: "IT002", produto_desc: "Produto B", meses: [
            { mes: "Jun/26", valor: 180.00 }, { mes: "Jul/26", valor: 180.00 }, { mes: "Ago/26", valor: 180.00 },
          ]},
        ],
      },
      {
        venda: "000151", cliente: "ALFA S.A.",
        produtos: [
          { produto: "IT003", produto_desc: "Serviço C", meses: [
            { mes: "Jun/26", valor: 500.00 }, { mes: "Jul/26", valor: 500.00 }, { mes: "Ago/26", valor: 500.00 }, { mes: "Set/26", valor: 500.00 }, { mes: "Out/26", valor: 500.00 },
          ]},
        ],
      },
    ],
  },
  {
    representante: "REP002", representante_nome: "Maria Oliveira",
    vendas: [
      {
        venda: "000152", cliente: "BETA LTDA",
        produtos: [
          { produto: "IT001", produto_desc: "Produto A", meses: [
            { mes: "Jun/26", valor: 120.00 }, { mes: "Jul/26", valor: 120.00 }, { mes: "Ago/26", valor: 120.00 },
          ]},
          { produto: "IT004", produto_desc: "Kit E", meses: [
            { mes: "Jun/26", valor: 350.00 }, { mes: "Jul/26", valor: 350.00 }, { mes: "Ago/26", valor: 350.00 }, { mes: "Set/26", valor: 350.00 },
          ]},
        ],
      },
    ],
  },
];

// ─── Component ────────────────────────────────────────────────────────────────

export function Vre0203Page(): JSX.Element {
  const [filtroDataInicial, setFiltroDataInicial] = useState("");
  const [filtroDataFinal, setFiltroDataFinal] = useState("");
  const [filtroCliente, setFiltroCliente] = useState("");
  const [filtroRepresentante, setFiltroRepresentante] = useState("");
  const [filtroItem, setFiltroItem] = useState("");
  const [filtroClassificacao, setFiltroClassificacao] = useState("");
  const [filtroReajuste, setFiltroReajuste] = useState("");

  const [resultados, setResultados] = useState<ComissaoRepresentante[]>([]);
  const [executado, setExecutado] = useState(false);
  const [feedback, setFeedback] = useState<FeedbackState>(null);
  const [isExecutando, setIsExecutando] = useState(false);

  function handleExecutar() {
    setIsExecutando(true);
    setFeedback(null);
    setTimeout(() => {
      setResultados(MOCK_COMISSOES);
      setExecutado(true);
      setFeedback({ type: "success", message: `${MOCK_COMISSOES.length} representante(s) com comissões futuras projetadas.` });
      setIsExecutando(false);
    }, 1000);
  }

  function handleLimpar() {
    setFiltroDataInicial("");
    setFiltroDataFinal("");
    setFiltroCliente("");
    setFiltroRepresentante("");
    setFiltroItem("");
    setFiltroClassificacao("");
    setFiltroReajuste("");
    setResultados([]);
    setExecutado(false);
    setFeedback(null);
  }

  function handleExtrair() {
    setFeedback({ type: "info", message: "Relatório extraído para Excel." });
  }

  const todosMeses = Array.from(new Set(
    resultados.flatMap((rep) =>
      rep.vendas.flatMap((v) =>
        v.produtos.flatMap((p) => p.meses.map((m) => m.mes))
      )
    )
  )).sort();

  return (
    <>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Inter:wght@300;400;500;600&display=swap');
        *, *::before, *::after { box-sizing: border-box; margin: 0; padding: 0; }

        .vre2-root { min-height: 100vh; background: #f0f4ee; font-family: 'Inter', sans-serif; color: #1a2e22; display: flex; flex-direction: column; }

        .vre2-topbar { height: 52px; background: #162e20; display: flex; align-items: center; justify-content: space-between; padding: 0 20px; flex-shrink: 0; border-bottom: 1px solid rgba(62,150,84,0.15); }
        .vre2-topbar-left { display: flex; align-items: center; gap: 10px; }
        .vre2-logo-mark { width: 28px; height: 28px; background: #3e9654; border-radius: 6px; display: flex; align-items: center; justify-content: center; }
        .vre2-app-name { font-size: 13px; font-weight: 600; color: #e0f0e3; line-height: 1.1; }
        .vre2-app-sub { display: block; font-size: 9px; font-weight: 400; color: #3d6b4d; }
        .vre2-screen-title { font-size: 12.5px; font-weight: 500; color: #5a9a6a; padding-left: 14px; margin-left: 14px; border-left: 1px solid rgba(255,255,255,0.08); }

        .vre2-actionbar { background: #fff; border-bottom: 1px solid #dbe8d5; padding: 0 20px; display: flex; align-items: center; gap: 4px; height: 46px; flex-shrink: 0; }
        .vre2-action-group { display: flex; align-items: center; gap: 4px; padding-right: 12px; margin-right: 8px; border-right: 1px solid #e8f0e4; }
        .vre2-action-group:last-child { border-right: none; }
        .vre2-action-label { font-size: 9.5px; font-weight: 600; letter-spacing: 0.8px; text-transform: uppercase; color: #96b8a0; margin-right: 4px; white-space: nowrap; }
        .vre2-btn { display: inline-flex; align-items: center; gap: 6px; height: 32px; padding: 0 12px; border: 1.5px solid transparent; border-radius: 7px; font-family: 'Inter', sans-serif; font-size: 12.5px; font-weight: 500; cursor: pointer; white-space: nowrap; transition: background 0.13s, border-color 0.13s, color 0.13s; }
        .vre2-btn-primary { background: #162e20; color: #dff0e2; border-color: #162e20; }
        .vre2-btn-primary:hover:not(:disabled) { background: #1e3a2a; }
        .vre2-btn-primary:disabled { opacity: 0.5; cursor: not-allowed; }
        .vre2-btn-ghost { background: transparent; color: #4a7060; border-color: #d4e8d0; }
        .vre2-btn-ghost:hover:not(:disabled) { background: #f0f8ec; border-color: #b0d4b8; color: #1a3828; }
        .vre2-btn-ghost:disabled { opacity: 0.5; cursor: not-allowed; }
        .vre2-btn-danger { background: transparent; color: #b94040; border-color: #f0c8c8; }
        .vre2-btn-danger:hover:not(:disabled) { background: #fff0f0; border-color: #e09090; }
        .vre2-btn-sm { height: 28px; padding: 0 9px; font-size: 12px; }
        .vre2-btn-new { background: #eef9f0; color: #1a6030; border-color: #b4d8b8; font-weight: 600; }
        .vre2-btn-new:hover:not(:disabled) { background: #dff5e4; border-color: #88c898; }
        .vre2-btn-export { background: #edf4fc; color: #1a4080; border-color: #b8d0e8; font-weight: 600; }
        .vre2-btn-export:hover:not(:disabled) { background: #dce8f8; border-color: #90b8d8; }

        .vre2-body { flex: 1; padding: 16px 20px; display: flex; flex-direction: column; gap: 0; overflow-y: auto; }
        .vre2-body::-webkit-scrollbar { width: 5px; }
        .vre2-body::-webkit-scrollbar-thumb { background: #cce0c8; border-radius: 4px; }

        .vre2-section-banner { display: flex; align-items: center; gap: 10px; padding: 14px 0 8px; }
        .vre2-section-banner:first-child { padding-top: 0; }
        .vre2-section-banner-pill { font-size: 9.5px; font-weight: 700; letter-spacing: 1.2px; text-transform: uppercase; color: #5a8068; background: #e0ede0; border: 1px solid #c8dcc8; border-radius: 20px; padding: 3px 10px; white-space: nowrap; }
        .vre2-section-banner-line { flex: 1; height: 1px; background: #dbe8d5; }
        .vre2-section-banner-hint { font-size: 11px; color: #96b8a0; white-space: nowrap; }

        .vre2-card { background: #fff; border: 1px solid #dbe8d5; border-radius: 12px; overflow: hidden; margin-bottom: 14px; }
        .vre2-card-header { display: flex; align-items: center; justify-content: space-between; padding: 12px 18px; border-bottom: 1px solid #edf5e8; background: #fafcf9; }
        .vre2-card-header-left { display: flex; align-items: center; gap: 8px; }
        .vre2-card-title { font-size: 12px; font-weight: 600; color: #2a4a35; text-transform: uppercase; letter-spacing: 0.6px; }
        .vre2-card-badge { font-size: 10.5px; font-weight: 500; color: #3e9654; background: #eef5ea; border: 1px solid #c4dfc8; border-radius: 12px; padding: 2px 8px; }
        .vre2-card-body { padding: 18px 18px; }

        .vre2-grid { display: grid; grid-template-columns: repeat(12, 1fr); gap: 16px 14px; align-items: start; }
        .vre2-col-2  { grid-column: span 2; }
        .vre2-col-3  { grid-column: span 3; }
        .vre2-col-4  { grid-column: span 4; }
        .vre2-col-5  { grid-column: span 5; }
        .vre2-col-6  { grid-column: span 6; }
        .vre2-col-12 { grid-column: span 12; }

        .vre2-field { display: flex; flex-direction: column; gap: 5px; }
        .vre2-label { font-size: 10.5px; font-weight: 600; color: #5a8068; text-transform: uppercase; letter-spacing: 0.4px; display: flex; align-items: center; gap: 4px; }
        .vre2-input { width: 100%; height: 36px; background: #f8fbf6; border: 1.5px solid #d4e8cc; border-radius: 7px; padding: 0 10px; font-family: 'Inter', sans-serif; font-size: 13px; color: #1a2e22; outline: none; transition: border-color 0.13s, box-shadow 0.13s; }
        .vre2-input:focus { border-color: #3e9654; box-shadow: 0 0 0 2px rgba(62,150,84,0.1); }
        .vre2-input::placeholder { color: #b0c8b8; font-size: 12px; }

        .vre2-results-wrap { overflow-x: auto; }
        .vre2-results-bar { display: flex; align-items: center; justify-content: space-between; padding: 10px 18px; background: #f4f9f2; border-bottom: 1px solid #e8f0e4; }
        .vre2-results-bar-left { display: flex; align-items: center; gap: 8px; }
        .vre2-results-bar-label { font-size: 11px; font-weight: 600; color: #4a7060; text-transform: uppercase; letter-spacing: 0.5px; }

        .vre2-report-table { width: 100%; border-collapse: collapse; font-size: 12.5px; }
        .vre2-report-table th { background: #f4f9f2; padding: 8px 10px; text-align: left; font-size: 10px; font-weight: 700; color: #5a8068; text-transform: uppercase; letter-spacing: 0.5px; border-bottom: 1.5px solid #dbe8d5; white-space: nowrap; }
        .vre2-report-table td { padding: 7px 10px; border-bottom: 1px solid #f0f6ec; color: #243830; vertical-align: middle; }
        .vre2-report-table .vre2-group-rep { background: #edf5ea; font-weight: 700; color: #1a4a2a; }
        .vre2-report-table .vre2-group-venda { background: #f8fbf6; font-weight: 600; color: #2a5a3a; }
        .vre2-report-table .vre2-mes-valor { text-align: right; font-variant-numeric: tabular-nums; }
        .vre2-report-table .vre2-total-col { text-align: right; font-weight: 600; color: #1a4a2a; }

        .vre2-feedback { display: flex; align-items: center; gap: 9px; padding: 11px 15px; border-radius: 9px; font-size: 13px; animation: vre2FadeIn 0.2s ease; margin-bottom: 14px; }
        .vre2-feedback.success { background: #f0faf2; border: 1px solid #b4dec0; color: #1e6030; }
        .vre2-feedback.error { background: #fff5f5; border: 1px solid #f8c0c0; border-left: 3px solid #e05252; color: #b91c1c; }
        .vre2-feedback.info { background: #f0f8ff; border: 1px solid #c7def8; border-left: 3px solid #4a90d9; color: #1a4070; }

        .vre2-footer { background: #fff; border-top: 1px solid #dbe8d5; padding: 8px 20px; display: flex; align-items: center; justify-content: space-between; flex-shrink: 0; }
        .vre2-footer-left { display: flex; align-items: center; gap: 20px; }
        .vre2-footer-stat { display: flex; align-items: center; gap: 6px; font-size: 11.5px; color: #6a8a74; }
        .vre2-footer-stat strong { color: #1a2e22; font-weight: 600; }

        @keyframes vre2Spin { to { transform: rotate(360deg); } }
        .vre2-spinner { width: 14px; height: 14px; flex-shrink: 0; border: 2px solid rgba(223,240,226,0.3); border-top-color: #dff0e2; border-radius: 50%; animation: vre2Spin 0.65s linear infinite; }
        .vre2-spinner-dark { width: 14px; height: 14px; flex-shrink: 0; border: 2px solid #d4e8cc; border-top-color: #3e9654; border-radius: 50%; animation: vre2Spin 0.65s linear infinite; }
        @keyframes vre2FadeIn { from { opacity: 0; transform: translateY(-4px); } to { opacity: 1; transform: translateY(0); } }
      `}</style>

      <div className="vre2-root">
        <header className="vre2-topbar">
          <div className="vre2-topbar-left">
            <div className="vre2-logo-mark">
              <svg width="15" height="15" viewBox="0 0 18 18" fill="none">
                <rect x="1.5" y="1.5" width="6" height="6" rx="1.2" fill="rgba(255,255,255,0.9)" />
                <rect x="10.5" y="1.5" width="6" height="6" rx="1.2" fill="rgba(255,255,255,0.4)" />
                <rect x="1.5" y="10.5" width="6" height="6" rx="1.2" fill="rgba(255,255,255,0.4)" />
                <rect x="10.5" y="10.5" width="6" height="6" rx="1.2" fill="rgba(255,255,255,0.7)" />
              </svg>
            </div>
            <span className="vre2-app-name">Venture<span className="vre2-app-sub">ERP &amp; Soluções</span></span>
            <span className="vre2-screen-title">VRE0203 — Consulta de Comissões Futuras</span>
          </div>
        </header>

        <div className="vre2-actionbar">
          <div className="vre2-action-group">
            <span className="vre2-action-label">Consulta</span>
            <button className="vre2-btn vre2-btn-new" onClick={handleExecutar} disabled={isExecutando}>
              {isExecutando
                ? <><div className="vre2-spinner-dark" />Executando...</>
                : <><svg width="12" height="12" viewBox="0 0 12 12" fill="none"><path d="M3 9l6-6M3 3l6 6" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" /></svg>Executar</>
              }
            </button>
          </div>
          {executado && (
            <>
              <div className="vre2-action-group">
                <span className="vre2-action-label">Resultados</span>
                <button className="vre2-btn vre2-btn-export" onClick={handleExtrair}>
                  <svg width="12" height="12" viewBox="0 0 12 12" fill="none"><path d="M6 1v7M3 5l3 3 3-3" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" strokeLinejoin="round" /><path d="M2 9v1.5h8V9" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" strokeLinejoin="round" /></svg>
                  Extrair
                </button>
              </div>
              <div className="vre2-action-group">
                <button className="vre2-btn vre2-btn-danger" onClick={handleLimpar}>
                  <svg width="13" height="13" viewBox="0 0 16 16" fill="none"><path d="M3 3l10 10M13 3L3 13" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" /></svg>
                  Limpar
                </button>
              </div>
            </>
          )}
        </div>

        <div className="vre2-body">
          {feedback && (
            <div className={`vre2-feedback ${feedback.type}`}>
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

          <div className="vre2-section-banner">
            <span className="vre2-section-banner-pill">1 — Filtrar</span>
            <div className="vre2-section-banner-line" />
            <span className="vre2-section-banner-hint">Preencha os filtros e clique em Executar para gerar o relatório</span>
          </div>

          <div className="vre2-card">
            <div className="vre2-card-header">
              <div className="vre2-card-header-left">
                <svg width="14" height="14" viewBox="0 0 16 16" fill="none"><circle cx="6.5" cy="6.5" r="4.5" stroke="#3e9654" strokeWidth="1.4" /><path d="M10 10l3.5 3.5" stroke="#3e9654" strokeWidth="1.4" strokeLinecap="round" /></svg>
                <span className="vre2-card-title">Filtros de Comissões Futuras</span>
              </div>
            </div>
            <div className="vre2-card-body">
              <div className="vre2-grid">
                <div className="vre2-field vre2-col-3">
                  <label className="vre2-label">Data Inicial</label>
                  <input type="date" className="vre2-input" value={filtroDataInicial} onChange={(e) => setFiltroDataInicial(e.target.value)} />
                </div>
                <div className="vre2-field vre2-col-3">
                  <label className="vre2-label">Data Final</label>
                  <input type="date" className="vre2-input" value={filtroDataFinal} onChange={(e) => setFiltroDataFinal(e.target.value)} />
                </div>
                <div className="vre2-field vre2-col-3">
                  <label className="vre2-label">Cliente</label>
                  <input className="vre2-input" placeholder="Código ou nome" value={filtroCliente} onChange={(e) => setFiltroCliente(e.target.value)} />
                </div>
                <div className="vre2-field vre2-col-3">
                  <label className="vre2-label">Representante</label>
                  <input className="vre2-input" placeholder="Código ou nome" value={filtroRepresentante} onChange={(e) => setFiltroRepresentante(e.target.value)} />
                </div>
                <div className="vre2-field vre2-col-3">
                  <label className="vre2-label">Item</label>
                  <input className="vre2-input" placeholder="Código" value={filtroItem} onChange={(e) => setFiltroItem(e.target.value)} />
                </div>
                <div className="vre2-field vre2-col-3">
                  <label className="vre2-label">Classificação de Itens</label>
                  <input className="vre2-input" placeholder="Classificação" value={filtroClassificacao} onChange={(e) => setFiltroClassificacao(e.target.value)} />
                </div>
                <div className="vre2-field vre2-col-3">
                  <label className="vre2-label">% Reajuste</label>
                  <input className="vre2-input" placeholder="0.00" type="number" step="0.01" value={filtroReajuste} onChange={(e) => setFiltroReajuste(e.target.value)} />
                </div>
              </div>
            </div>
          </div>

          {executado && resultados.length > 0 && (
            <>
              <div className="vre2-section-banner">
                <span className="vre2-section-banner-pill">2 — Resultados</span>
                <div className="vre2-section-banner-line" />
                <span className="vre2-section-banner-hint">Projeção de comissões futuras — agrupado por representante / venda / produto</span>
              </div>

              <div className="vre2-card">
                <div className="vre2-results-wrap">
                  <div className="vre2-results-bar">
                    <div className="vre2-results-bar-left">
                      <svg width="13" height="13" viewBox="0 0 16 16" fill="none"><path d="M2 4h12M2 8h12M2 12h8" stroke="#5a8068" strokeWidth="1.4" strokeLinecap="round" /></svg>
                      <span className="vre2-results-bar-label">Comissões Futuras</span>
                      <span className="vre2-card-badge">{resultados.length} representante(s)</span>
                    </div>
                  </div>

                  <table className="vre2-report-table">
                    <thead>
                      <tr>
                        <th style={{ minWidth: 100 }}>Rep. / Venda / Produto</th>
                        <th style={{ minWidth: 120 }}>Descrição</th>
                        {todosMeses.map((mes) => (
                          <th key={mes} style={{ textAlign: "right", minWidth: 90 }}>{mes}</th>
                        ))}
                        <th style={{ textAlign: "right", minWidth: 90 }}>Total</th>
                      </tr>
                    </thead>
                    <tbody>
                      {resultados.map((rep) => {
                        const repTotal = rep.vendas.reduce((s, v) =>
                          s + v.produtos.reduce((sp, p) =>
                            sp + p.meses.reduce((sm, m) => sm + m.valor, 0), 0), 0);
                        return (
                          <>
                            <tr key={rep.representante} className="vre2-group-rep">
                              <td colSpan={2}>{rep.representante} — {rep.representante_nome}</td>
                              {todosMeses.map((mes) => <td key={mes} className="vre2-mes-valor">—</td>)}
                              <td className="vre2-total-col">R$ {repTotal.toFixed(2)}</td>
                            </tr>
                            {rep.vendas.map((venda) => {
                              const vendaTotal = venda.produtos.reduce((s, p) => s + p.meses.reduce((sm, m) => sm + m.valor, 0), 0);
                              return (
                                <>
                                  <tr key={`${rep.representante}-${venda.venda}`} className="vre2-group-venda">
                                    <td colSpan={2} style={{ paddingLeft: 24 }}>Venda #{venda.venda} — {venda.cliente}</td>
                                    {todosMeses.map((mes) => <td key={mes} className="vre2-mes-valor">—</td>)}
                                    <td className="vre2-total-col">R$ {vendaTotal.toFixed(2)}</td>
                                  </tr>
                                  {venda.produtos.map((prod) => {
                                    const prodTotal = prod.meses.reduce((s, m) => s + m.valor, 0);
                                    const mesMap = Object.fromEntries(prod.meses.map((m) => [m.mes, m.valor]));
                                    return (
                                      <tr key={`${venda.venda}-${prod.produto}`}>
                                        <td style={{ paddingLeft: 48, fontWeight: 600, fontSize: 11 }}>{prod.produto}</td>
                                        <td style={{ fontSize: 11, color: "#6a8a74" }}>{prod.produto_desc}</td>
                                        {todosMeses.map((mes) => (
                                          <td key={mes} className="vre2-mes-valor">{mesMap[mes] != null ? `R$ ${mesMap[mes].toFixed(2)}` : "—"}</td>
                                        ))}
                                        <td className="vre2-total-col">R$ {prodTotal.toFixed(2)}</td>
                                      </tr>
                                    );
                                  })}
                                </>
                              );
                            })}
                          </>
                        );
                      })}
                      <tr style={{ background: "#edf5ea", fontWeight: 700, fontSize: 13 }}>
                        <td colSpan={2}>TOTAL GERAL</td>
                        {todosMeses.map((mes) => {
                          const mesTotal = resultados.reduce((s, rep) =>
                            s + rep.vendas.reduce((sv, v) =>
                              sv + v.produtos.reduce((sp, p) =>
                                sp + (p.meses.find((m) => m.mes === mes)?.valor ?? 0), 0), 0), 0);
                          return <td key={mes} className="vre2-total-col">R$ {mesTotal.toFixed(2)}</td>;
                        })}
                        <td className="vre2-total-col">R$ {resultados.reduce((s, rep) =>
                          s + rep.vendas.reduce((sv, v) =>
                            sv + v.produtos.reduce((sp, p) =>
                              sp + p.meses.reduce((sm, m) => sm + m.valor, 0), 0), 0), 0).toFixed(2)}</td>
                      </tr>
                    </tbody>
                  </table>
                </div>
              </div>
            </>
          )}
        </div>

        <footer className="vre2-footer">
          <div className="vre2-footer-left">
            <div className="vre2-footer-stat">Representantes: <strong>{resultados.length}</strong></div>
            <div className="vre2-footer-stat">Vendas: <strong>{resultados.reduce((s, r) => s + r.vendas.length, 0)}</strong></div>
            <div className="vre2-footer-stat">Meses Projetados: <strong>{todosMeses.length}</strong></div>
          </div>
          <div className="vre2-footer-stat" style={{ gap: 8 }}>
            <span style={{ color: "#b0c8b8", fontSize: 11 }}>GRUPO VENTURE LTDA</span>
          </div>
        </footer>
      </div>
    </>
  );
}
