import { useState } from "react";

// ─── Types ────────────────────────────────────────────────────────────────────

type TipoMovimento = "Upgrade" | "Downgrade" | "Reajuste" | "Venda" | "Cancelamento";

interface VendaRecorrenteRow {
  id: number;
  tipo_movimento: TipoMovimento;
  cliente: string;
  cliente_nome: string;
  estabelecimento: string;
  item: string;
  item_desc: string;
  valor: number;
  parcelas: number;
  prox_pagamento: string;
  data_reajuste: string;
  num_pedido: string;
  ativo: boolean;
}

type FeedbackState = { type: "success" | "error" | "info"; message: string } | null;

const TIPO_MOV_OPTS: TipoMovimento[] = ["Upgrade", "Downgrade", "Reajuste", "Venda", "Cancelamento"];

const MOCK_VENDAS: VendaRecorrenteRow[] = [
  { id: 1, tipo_movimento: "Venda", cliente: "001", cliente_nome: "SOHOME LTDA", estabelecimento: "MATRIZ", item: "IT001", item_desc: "Produto A", valor: 2500.00, parcelas: 12, prox_pagamento: "2026-06-15", data_reajuste: "2027-01-01", num_pedido: "000123", ativo: true },
  { id: 2, tipo_movimento: "Upgrade", cliente: "002", cliente_nome: "ALFA S.A.", estabelecimento: "FILIAL 1", item: "IT002", item_desc: "Produto B Premium", valor: 5800.00, parcelas: 24, prox_pagamento: "2026-05-20", data_reajuste: "2026-12-31", num_pedido: "000124", ativo: true },
  { id: 3, tipo_movimento: "Reajuste", cliente: "003", cliente_nome: "BETA LTDA", estabelecimento: "MATRIZ", item: "IT003", item_desc: "Serviço C", valor: 1250.00, parcelas: 6, prox_pagamento: "2026-07-01", data_reajuste: "2026-07-01", num_pedido: "000125", ativo: true },
  { id: 4, tipo_movimento: "Downgrade", cliente: "004", cliente_nome: "GAMA ME", estabelecimento: "MATRIZ", item: "IT001", item_desc: "Produto A", valor: 1500.00, parcelas: 12, prox_pagamento: "2026-04-30", data_reajuste: "2026-10-01", num_pedido: "000126", ativo: false },
  { id: 5, tipo_movimento: "Cancelamento", cliente: "005", cliente_nome: "DELTA EIRELI", estabelecimento: "FILIAL 2", item: "IT004", item_desc: "Produto D", valor: 890.00, parcelas: 3, prox_pagamento: "2026-03-10", data_reajuste: "—", num_pedido: "000127", ativo: false },
  { id: 6, tipo_movimento: "Venda", cliente: "006", cliente_nome: "OMEGA LTDA", estabelecimento: "MATRIZ", item: "IT005", item_desc: "Kit E", valor: 3200.00, parcelas: 18, prox_pagamento: "2026-08-05", data_reajuste: "2027-03-01", num_pedido: "000128", ativo: true },
];

// ─── Component ────────────────────────────────────────────────────────────────

export function Vvre0200Page(): JSX.Element {
  const [filtroTipo, setFiltroTipo] = useState("");
  const [somenteAtivos, setSomenteAtivos] = useState(false);
  const [rows, setRows] = useState<VendaRecorrenteRow[]>(MOCK_VENDAS);
  const [selectedId, setSelectedId] = useState<number | null>(null);
  const [feedback, setFeedback] = useState<FeedbackState>(null);
  const [isSearching, setIsSearching] = useState(false);

  function handlePesquisar() {
    setIsSearching(true);
    let filtered = MOCK_VENDAS;
    if (filtroTipo) filtered = filtered.filter((v) => v.tipo_movimento === filtroTipo);
    if (somenteAtivos) filtered = filtered.filter((v) => v.ativo);
    setRows(filtered);
    setSelectedId(null);
    setFeedback({ type: "info", message: `${filtered.length} venda(s) recorrente(s) encontrada(s).` });
    setIsSearching(false);
  }

  function handleNovo() { setFeedback({ type: "info", message: "Abrir formulário de nova venda recorrente." }); }
  function handleDataReajuste() { setFeedback({ type: "info", message: "Configurar data de reajuste em lote." }); }
  function handleGerarPedido() { setFeedback({ type: "success", message: "Pedido gerado com sucesso." }); }
  function handleExclusaoPedido() { setFeedback({ type: "success", message: "Pedido excluído." }); }
  function handleExclusaoRecorrencia() { setFeedback({ type: "success", message: "Recorrência excluída." }); }
  function handleRecalculo() { setFeedback({ type: "success", message: "Recálculo realizado." }); }
  function handleEdicao() { setFeedback({ type: "info", message: "Abrir edição da venda." }); }
  function handleCancelamento() { setFeedback({ type: "success", message: "Venda cancelada." }); }
  function handleDowngrade() { setFeedback({ type: "success", message: "Downgrade realizado." }); }

  const selected = rows.find((r) => r.id === selectedId);

  const TIPO_BADGE: Record<TipoMovimento, string> = {
    Venda:         "vre-tipo-venda",
    Upgrade:       "vre-tipo-upgrade",
    Downgrade:     "vre-tipo-downgrade",
    Reajuste:      "vre-tipo-reajuste",
    Cancelamento:  "vre-tipo-cancel",
  };

  return (
    <>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Inter:wght@300;400;500;600&display=swap');
        *, *::before, *::after { box-sizing: border-box; margin: 0; padding: 0; }

        .vre-root { min-height: 100vh; background: #f0f4ee; font-family: 'Inter', sans-serif; color: #1a2e22; display: flex; flex-direction: column; }

        .vre-topbar { height: 52px; background: #162e20; display: flex; align-items: center; justify-content: space-between; padding: 0 20px; flex-shrink: 0; border-bottom: 1px solid rgba(62,150,84,0.15); }
        .vre-topbar-left { display: flex; align-items: center; gap: 10px; }
        .vre-logo-mark { width: 28px; height: 28px; background: #3e9654; border-radius: 6px; display: flex; align-items: center; justify-content: center; }
        .vre-app-name { font-size: 13px; font-weight: 600; color: #e0f0e3; line-height: 1.1; }
        .vre-app-sub { display: block; font-size: 9px; font-weight: 400; color: #3d6b4d; }
        .vre-screen-title { font-size: 12.5px; font-weight: 500; color: #5a9a6a; padding-left: 14px; margin-left: 14px; border-left: 1px solid rgba(255,255,255,0.08); }

        .vre-actionbar { background: #fff; border-bottom: 1px solid #dbe8d5; padding: 0 20px; display: flex; align-items: center; gap: 4px; height: 46px; flex-shrink: 0; }
        .vre-action-group { display: flex; align-items: center; gap: 4px; padding-right: 12px; margin-right: 8px; border-right: 1px solid #e8f0e4; }
        .vre-action-group:last-child { border-right: none; }
        .vre-action-label { font-size: 9.5px; font-weight: 600; letter-spacing: 0.8px; text-transform: uppercase; color: #96b8a0; margin-right: 4px; white-space: nowrap; }
        .vre-btn { display: inline-flex; align-items: center; gap: 6px; height: 32px; padding: 0 12px; border: 1.5px solid transparent; border-radius: 7px; font-family: 'Inter', sans-serif; font-size: 12.5px; font-weight: 500; cursor: pointer; white-space: nowrap; transition: background 0.13s, border-color 0.13s, color 0.13s; }
        .vre-btn-primary { background: #162e20; color: #dff0e2; border-color: #162e20; }
        .vre-btn-primary:hover:not(:disabled) { background: #1e3a2a; }
        .vre-btn-primary:disabled { opacity: 0.5; cursor: not-allowed; }
        .vre-btn-ghost { background: transparent; color: #4a7060; border-color: #d4e8d0; }
        .vre-btn-ghost:hover:not(:disabled) { background: #f0f8ec; border-color: #b0d4b8; color: #1a3828; }
        .vre-btn-ghost:disabled { opacity: 0.5; cursor: not-allowed; }
        .vre-btn-danger { background: transparent; color: #b94040; border-color: #f0c8c8; }
        .vre-btn-danger:hover:not(:disabled) { background: #fff0f0; border-color: #e09090; }
        .vre-btn-sm { height: 28px; padding: 0 9px; font-size: 12px; }
        .vre-btn-new { background: #eef9f0; color: #1a6030; border-color: #b4d8b8; font-weight: 600; }
        .vre-btn-new:hover:not(:disabled) { background: #dff5e4; border-color: #88c898; }
        .vre-btn-blue { background: #edf4fc; color: #1a4080; border-color: #b8d0e8; font-weight: 600; }
        .vre-btn-blue:hover:not(:disabled) { background: #dce8f8; border-color: #90b8d8; }
        .vre-btn-action { background: transparent; color: #4a7060; border-color: #d4e8d0; font-weight: 500; }
        .vre-btn-action:hover:not(:disabled) { background: #f0f8ec; border-color: #b0d4b8; color: #1a3828; }
        .vre-btn-action:disabled { opacity: 0.35; cursor: not-allowed; background: #f4f9f2; }

        .vre-body { flex: 1; padding: 16px 20px; display: flex; flex-direction: column; gap: 0; overflow-y: auto; }
        .vre-body::-webkit-scrollbar { width: 5px; }
        .vre-body::-webkit-scrollbar-thumb { background: #cce0c8; border-radius: 4px; }

        .vre-section-banner { display: flex; align-items: center; gap: 10px; padding: 14px 0 8px; }
        .vre-section-banner:first-child { padding-top: 0; }
        .vre-section-banner-pill { font-size: 9.5px; font-weight: 700; letter-spacing: 1.2px; text-transform: uppercase; color: #5a8068; background: #e0ede0; border: 1px solid #c8dcc8; border-radius: 20px; padding: 3px 10px; white-space: nowrap; }
        .vre-section-banner-line { flex: 1; height: 1px; background: #dbe8d5; }
        .vre-section-banner-hint { font-size: 11px; color: #96b8a0; white-space: nowrap; }

        .vre-card { background: #fff; border: 1px solid #dbe8d5; border-radius: 12px; overflow: hidden; margin-bottom: 14px; }
        .vre-card-header { display: flex; align-items: center; justify-content: space-between; padding: 12px 18px; border-bottom: 1px solid #edf5e8; background: #fafcf9; }
        .vre-card-header-left { display: flex; align-items: center; gap: 8px; }
        .vre-card-title { font-size: 12px; font-weight: 600; color: #2a4a35; text-transform: uppercase; letter-spacing: 0.6px; }
        .vre-card-badge { font-size: 10.5px; font-weight: 500; color: #3e9654; background: #eef5ea; border: 1px solid #c4dfc8; border-radius: 12px; padding: 2px 8px; }
        .vre-card-body { padding: 18px 18px; }

        .vre-filter-row { display: flex; align-items: flex-end; gap: 12px; flex-wrap: wrap; }
        .vre-field { display: flex; flex-direction: column; gap: 5px; }
        .vre-label { font-size: 10.5px; font-weight: 600; color: #5a8068; text-transform: uppercase; letter-spacing: 0.4px; display: flex; align-items: center; gap: 4px; }
        .vre-input { width: 100%; height: 36px; background: #f8fbf6; border: 1.5px solid #d4e8cc; border-radius: 7px; padding: 0 10px; font-family: 'Inter', sans-serif; font-size: 13px; color: #1a2e22; outline: none; transition: border-color 0.13s, box-shadow 0.13s; }
        .vre-input:focus { border-color: #3e9654; box-shadow: 0 0 0 2px rgba(62,150,84,0.1); }
        .vre-input::placeholder { color: #b0c8b8; font-size: 12px; }
        .vre-select { width: 100%; height: 36px; background: #f8fbf6; border: 1.5px solid #d4e8cc; border-radius: 7px; padding: 0 28px 0 10px; font-family: 'Inter', sans-serif; font-size: 13px; color: #1a2e22; outline: none; appearance: none; cursor: pointer; background-image: url("data:image/svg+xml,%3Csvg width='10' height='6' viewBox='0 0 10 6' xmlns='http://www.w3.org/2000/svg'%3E%3Cpath d='M1 1l4 4 4-4' stroke='%23789a84' stroke-width='1.5' fill='none' stroke-linecap='round' stroke-linejoin='round'/%3E%3C/svg%3E"); background-repeat: no-repeat; background-position: right 10px center; transition: border-color 0.13s; }
        .vre-select:focus { border-color: #3e9654; box-shadow: 0 0 0 2px rgba(62,150,84,0.1); }
        .vre-check-row { display: flex; align-items: center; gap: 8px; padding-top: 6px; }
        .vre-check-row input[type="checkbox"] { width: 15px; height: 15px; accent-color: #3e9654; cursor: pointer; flex-shrink: 0; }
        .vre-check-row label { font-size: 13px; color: #3a5a45; cursor: pointer; font-weight: 500; }

        .vre-results-wrap { border-top: 1px solid #edf5e8; overflow-x: auto; }
        .vre-results-bar { display: flex; align-items: center; justify-content: space-between; padding: 10px 18px; background: #f4f9f2; border-bottom: 1px solid #e8f0e4; }
        .vre-results-bar-left { display: flex; align-items: center; gap: 8px; }
        .vre-results-bar-label { font-size: 11px; font-weight: 600; color: #4a7060; text-transform: uppercase; letter-spacing: 0.5px; }
        .vre-results-table { width: 100%; border-collapse: collapse; font-size: 13px; }
        .vre-results-table th { background: #f4f9f2; padding: 8px 12px; text-align: left; font-size: 10.5px; font-weight: 700; color: #5a8068; text-transform: uppercase; letter-spacing: 0.5px; border-bottom: 1.5px solid #dbe8d5; white-space: nowrap; }
        .vre-results-table td { padding: 9px 12px; border-bottom: 1px solid #f0f6ec; color: #243830; vertical-align: middle; }
        .vre-results-table tbody tr { cursor: pointer; transition: background 0.1s; }
        .vre-results-table tbody tr:hover { background: #eef9f0; }
        .vre-results-table tbody tr.selected { background: #e8f5e0; }
        .vre-results-empty { text-align: center; padding: 28px 12px; color: #96b8a0; font-size: 12.5px; }

        .vre-tipo-badge { display: inline-flex; align-items: center; font-size: 11px; font-weight: 600; border-radius: 12px; padding: 2px 8px; }
        .vre-tipo-venda { background: #e8f5e0; color: #2a6018; border: 1px solid #b4d898; }
        .vre-tipo-upgrade { background: #e8f0fc; color: #1a4080; border: 1px solid #a8c0e8; }
        .vre-tipo-downgrade { background: #fdf8e8; color: #604800; border: 1px solid #e0d090; }
        .vre-tipo-reajuste { background: #ede0f8; color: #4a1060; border: 1px solid #c8a8e0; }
        .vre-tipo-cancel { background: #fde8e8; color: #6a1010; border: 1px solid #e0a8a8; }

        .vre-link { color: #2a6fd4; cursor: pointer; font-weight: 600; text-decoration: none; }
        .vre-link:hover { text-decoration: underline; }

        .vre-actions-bar { display: flex; align-items: center; gap: 6px; padding: 12px 18px; background: #fafcf9; border-top: 1px solid #edf5e8; flex-wrap: wrap; }
        .vre-actions-bar-label { font-size: 10px; font-weight: 700; color: #96b8a0; text-transform: uppercase; letter-spacing: 0.6px; margin-right: 6px; }

        .vre-feedback { display: flex; align-items: center; gap: 9px; padding: 11px 15px; border-radius: 9px; font-size: 13px; animation: vreFadeIn 0.2s ease; margin-bottom: 14px; }
        .vre-feedback.success { background: #f0faf2; border: 1px solid #b4dec0; color: #1e6030; }
        .vre-feedback.error { background: #fff5f5; border: 1px solid #f8c0c0; border-left: 3px solid #e05252; color: #b91c1c; }
        .vre-feedback.info { background: #f0f8ff; border: 1px solid #c7def8; border-left: 3px solid #4a90d9; color: #1a4070; }

        .vre-footer { background: #fff; border-top: 1px solid #dbe8d5; padding: 8px 20px; display: flex; align-items: center; justify-content: space-between; flex-shrink: 0; }
        .vre-footer-left { display: flex; align-items: center; gap: 20px; }
        .vre-footer-stat { display: flex; align-items: center; gap: 6px; font-size: 11.5px; color: #6a8a74; }
        .vre-footer-stat strong { color: #1a2e22; font-weight: 600; }

        @keyframes vreSpin { to { transform: rotate(360deg); } }
        .vre-spinner { width: 14px; height: 14px; flex-shrink: 0; border: 2px solid rgba(223,240,226,0.3); border-top-color: #dff0e2; border-radius: 50%; animation: vreSpin 0.65s linear infinite; }
        .vre-spinner-dark { width: 14px; height: 14px; flex-shrink: 0; border: 2px solid #d4e8cc; border-top-color: #3e9654; border-radius: 50%; animation: vreSpin 0.65s linear infinite; }
        @keyframes vreFadeIn { from { opacity: 0; transform: translateY(-4px); } to { opacity: 1; transform: translateY(0); } }
      `}</style>

      <div className="vre-root">
        <header className="vre-topbar">
          <div className="vre-topbar-left">
            <div className="vre-logo-mark">
              <svg width="15" height="15" viewBox="0 0 18 18" fill="none">
                <rect x="1.5" y="1.5" width="6" height="6" rx="1.2" fill="rgba(255,255,255,0.9)" />
                <rect x="10.5" y="1.5" width="6" height="6" rx="1.2" fill="rgba(255,255,255,0.4)" />
                <rect x="1.5" y="10.5" width="6" height="6" rx="1.2" fill="rgba(255,255,255,0.4)" />
                <rect x="10.5" y="10.5" width="6" height="6" rx="1.2" fill="rgba(255,255,255,0.7)" />
              </svg>
            </div>
            <span className="vre-app-name">Venture<span className="vre-app-sub">ERP &amp; Soluções</span></span>
            <span className="vre-screen-title">VVRE0200 — Console de Vendas Recorrentes</span>
          </div>
        </header>

        <div className="vre-actionbar">
          <div className="vre-action-group">
            <span className="vre-action-label">Cadastro</span>
            <button className="vre-btn vre-btn-new" onClick={handleNovo}>
              <svg width="12" height="12" viewBox="0 0 12 12" fill="none"><path d="M6 2v8M2 6h8" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" /></svg>
              Novo
            </button>
          </div>
          <div className="vre-action-group">
            <button className="vre-btn vre-btn-blue" onClick={handleDataReajuste}>
              <svg width="12" height="12" viewBox="0 0 12 12" fill="none"><rect x="1.5" y="2.5" width="9" height="8" rx="1.5" stroke="currentColor" strokeWidth="1.2" /><path d="M1.5 5h9M4 1v3M8 1v3" stroke="currentColor" strokeWidth="1.2" strokeLinecap="round" /></svg>
              Data Reajuste
            </button>
          </div>
        </div>

        <div className="vre-body">
          {feedback && (
            <div className={`vre-feedback ${feedback.type}`}>
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

          <div className="vre-section-banner">
            <span className="vre-section-banner-pill">1 — Filtrar</span>
            <div className="vre-section-banner-line" />
            <span className="vre-section-banner-hint">Selecione os filtros e clique em Pesquisar</span>
          </div>

          <div className="vre-card">
            <div className="vre-card-header">
              <div className="vre-card-header-left">
                <svg width="14" height="14" viewBox="0 0 16 16" fill="none"><circle cx="6.5" cy="6.5" r="4.5" stroke="#3e9654" strokeWidth="1.4" /><path d="M10 10l3.5 3.5" stroke="#3e9654" strokeWidth="1.4" strokeLinecap="round" /></svg>
                <span className="vre-card-title">Filtros</span>
              </div>
            </div>
            <div className="vre-card-body" style={{ paddingBottom: 14 }}>
              <div className="vre-filter-row">
                <div className="vre-field" style={{ flex: "0 0 200px" }}>
                  <label className="vre-label">Tipo Movimento</label>
                  <select className="vre-select" value={filtroTipo} onChange={(e) => setFiltroTipo(e.target.value)}>
                    <option value="">Todos</option>
                    {TIPO_MOV_OPTS.map((t) => <option key={t} value={t}>{t}</option>)}
                  </select>
                </div>
                <div className="vre-check-row">
                  <input type="checkbox" id="vre-ativos" checked={somenteAtivos} onChange={(e) => setSomenteAtivos(e.target.checked)} />
                  <label htmlFor="vre-ativos">Somente ativos</label>
                </div>
                <div style={{ alignSelf: "flex-end" }}>
                  <button className="vre-btn vre-btn-ghost" onClick={handlePesquisar} disabled={isSearching}>
                    {isSearching
                      ? <><div className="vre-spinner-dark" />Buscando...</>
                      : <><svg width="13" height="13" viewBox="0 0 16 16" fill="none"><circle cx="6.5" cy="6.5" r="4.5" stroke="currentColor" strokeWidth="1.4" /><path d="M10 10l3.5 3.5" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" /></svg>Pesquisar</>
                    }
                  </button>
                </div>
              </div>
            </div>
          </div>

          <div className="vre-section-banner">
            <span className="vre-section-banner-pill">2 — Vendas Recorrentes</span>
            <div className="vre-section-banner-line" />
            <span className="vre-section-banner-hint">{rows.length} venda(s) listada(s)</span>
          </div>

          <div className="vre-card">
            <div className="vre-results-wrap">
              <div className="vre-results-bar">
                <div className="vre-results-bar-left">
                  <svg width="13" height="13" viewBox="0 0 16 16" fill="none"><path d="M2 4h12M2 8h12M2 12h8" stroke="#5a8068" strokeWidth="1.4" strokeLinecap="round" /></svg>
                  <span className="vre-results-bar-label">Console de Vendas</span>
                  <span className="vre-card-badge">{rows.length} registro(s)</span>
                </div>
              </div>
              {rows.length === 0 ? (
                <div className="vre-results-empty">Nenhuma venda recorrente encontrada.</div>
              ) : (
                <table className="vre-results-table">
                  <thead>
                    <tr>
                      <th style={{ width: 40 }}></th>
                      <th style={{ width: 90 }}>Tp. Mov</th>
                      <th style={{ width: 100 }}>Cliente</th>
                      <th style={{ width: 90 }}>Estab.</th>
                      <th>Item</th>
                      <th style={{ width: 100 }}>Valor</th>
                      <th style={{ width: 80 }}>Parcelas</th>
                      <th style={{ width: 110 }}>Próx. Pag.</th>
                      <th style={{ width: 110 }}>Data Reajuste</th>
                      <th style={{ width: 110 }}>Nº Pedido</th>
                    </tr>
                  </thead>
                  <tbody>
                    {rows.map((v) => (
                      <tr key={v.id} className={selectedId === v.id ? "selected" : ""} onClick={() => setSelectedId(v.id)}>
                        <td><input type="checkbox" checked={selectedId === v.id} readOnly /></td>
                        <td><span className={`vre-tipo-badge ${TIPO_BADGE[v.tipo_movimento]}`}>{v.tipo_movimento}</span></td>
                        <td><span style={{ fontWeight: 600, color: "#1a4a2a" }}>{v.cliente}</span><br /><span style={{ fontSize: 11, color: "#96b8a0" }}>{v.cliente_nome}</span></td>
                        <td style={{ fontSize: 12 }}>{v.estabelecimento}</td>
                        <td><span style={{ fontWeight: 500 }}>{v.item}</span> — {v.item_desc}</td>
                        <td style={{ fontWeight: 600 }}>R$ {v.valor.toFixed(2)}</td>
                        <td style={{ textAlign: "center" }}>{v.parcelas}x</td>
                        <td style={{ fontSize: 12 }}>{v.prox_pagamento}</td>
                        <td style={{ fontSize: 12 }}>{v.data_reajuste}</td>
                        <td><span className="vre-link" onClick={(e) => { e.stopPropagation(); setFeedback({ type: "info", message: `Abrir pedido ${v.num_pedido}` }); }}>{v.num_pedido}</span></td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              )}
              {selectedId !== null && (
                <div className="vre-actions-bar">
                  <span className="vre-actions-bar-label">Ações da Linha:</span>
                  <button className="vre-btn vre-btn-action vre-btn-sm" onClick={handleGerarPedido} disabled={!selected}>Gerar pedido</button>
                  <button className="vre-btn vre-btn-action vre-btn-sm" onClick={handleExclusaoPedido} disabled={!selected}>Exclusão de pedido</button>
                  <button className="vre-btn vre-btn-action vre-btn-sm" onClick={handleExclusaoRecorrencia} disabled={!selected}>Exclusão de recorrência</button>
                  <button className="vre-btn vre-btn-action vre-btn-sm" onClick={handleRecalculo} disabled={!selected}>Recálculo</button>
                  <button className="vre-btn vre-btn-action vre-btn-sm" onClick={handleEdicao} disabled={!selected}>Edição</button>
                  <button className="vre-btn vre-btn-action vre-btn-sm" onClick={handleCancelamento} disabled={!selected}>Cancelamento</button>
                  <button className="vre-btn vre-btn-action vre-btn-sm" onClick={handleDowngrade} disabled={!selected}>Downgrade</button>
                </div>
              )}
            </div>
          </div>
        </div>

        <footer className="vre-footer">
          <div className="vre-footer-left">
            <div className="vre-footer-stat">Total: <strong>{rows.length}</strong></div>
            <div className="vre-footer-stat">Valor Total: <strong>R$ {rows.reduce((s, v) => s + v.valor, 0).toFixed(2)}</strong></div>
            <div className="vre-footer-stat">Selecionado: <strong>{selected ? `${selected.cliente} — ${selected.item}` : "—"}</strong></div>
          </div>
          <div className="vre-footer-stat" style={{ gap: 8 }}>
            <span style={{ color: "#b0c8b8", fontSize: 11 }}>GRUPO VENTURE LTDA</span>
          </div>
        </footer>
      </div>
    </>
  );
}
