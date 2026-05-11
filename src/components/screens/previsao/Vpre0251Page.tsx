import { useState } from "react";

// ─── Types ────────────────────────────────────────────────────────────────────

type Historico = "pedidos" | "faturamento";
type FeedbackState = { type: "success" | "error" | "info"; message: string } | null;

interface ItemPrevisao {
  id: number;
  item: string;
  descricao: string;
  unidade: string;
  mediaHistorica: number;
  projecao: number;
  selecionado: boolean;
}

const ITENS_MOCK: ItemPrevisao[] = [
  { id: 1, item: "10001", descricao: "PRODUTO A - LINHA STANDARD", unidade: "UN", mediaHistorica: 250, projecao: 250, selecionado: false },
  { id: 2, item: "10002", descricao: "PRODUTO B - COMPONENTE X", unidade: "KG", mediaHistorica: 1200, projecao: 1200, selecionado: false },
  { id: 3, item: "10003", descricao: "PRODUTO C - SUBCONJUNTO", unidade: "UN", mediaHistorica: 80, projecao: 80, selecionado: false },
  { id: 4, item: "10004", descricao: "MATÉRIA-PRIMA D", unidade: "MT", mediaHistorica: 5400, projecao: 5400, selecionado: false },
  { id: 5, item: "10005", descricao: "EMBALAGEM E - CAIXA", unidade: "UN", mediaHistorica: 900, projecao: 900, selecionado: false },
];

// ─── Helpers ──────────────────────────────────────────────────────────────────

function aplicarProjecao(media: number, indice: number): number {
  return parseFloat((media * (1 + indice / 100)).toFixed(4));
}

// ─── Component ────────────────────────────────────────────────────────────────

export function Vpre0251Page(): JSX.Element {
  const [historico, setHistorico]       = useState<Historico>("pedidos");
  const [periodoIni, setPeriodoIni]     = useState("");
  const [periodoFin, setPeriodoFin]     = useState("");
  const [semanaGerarIni, setSemanaGerarIni] = useState("");
  const [anoGerarIni, setAnoGerarIni]   = useState("");
  const [semanaGerarFin, setSemanaGerarFin] = useState("");
  const [anoGerarFin, setAnoGerarFin]   = useState("");
  const [indiceProjecao, setIndiceProjecao] = useState("0");
  const [empresa, setEmpresa]           = useState("");
  const [filtroItem, setFiltroItem]     = useState("");
  const [itens, setItens]               = useState<ItemPrevisao[]>(ITENS_MOCK);
  const [feedback, setFeedback]         = useState<FeedbackState>(null);
  const [isLoading, setIsLoading]       = useState(false);
  const [isGerando, setIsGerando]       = useState(false);
  const [errors, setErrors]             = useState<Record<string, string>>({});

  const todosSelecionados = itens.every((it) => it.selecionado);
  const alguemSelecionado = itens.some((it) => it.selecionado);
  const itensFiltrados = filtroItem.trim()
    ? itens.filter((it) => it.item.includes(filtroItem) || it.descricao.toLowerCase().includes(filtroItem.toLowerCase()))
    : itens;

  function handleToggleAll() {
    const novoEstado = !todosSelecionados;
    setItens((p) => p.map((it) => ({ ...it, selecionado: novoEstado })));
  }

  function handleToggleItem(id: number) {
    setItens((p) => p.map((it) => it.id === id ? { ...it, selecionado: !it.selecionado } : it));
  }

  function handleAtualizarProjecao(val: string) {
    const idx = parseFloat(val);
    setIndiceProjecao(val);
    if (!isNaN(idx)) {
      setItens((p) => p.map((it) => ({
        ...it,
        projecao: aplicarProjecao(it.mediaHistorica, idx),
      })));
    }
  }

  function validateGerar(): boolean {
    const e: Record<string, string> = {};
    if (!periodoIni) e.periodoIni = "Data inicial obrigatória.";
    if (!periodoFin) e.periodoFin = "Data final obrigatória.";
    if (periodoIni && periodoFin && periodoFin < periodoIni) e.periodoFin = "Data final deve ser posterior à inicial.";
    if (!semanaGerarIni || !anoGerarIni) e.semanaGerIni = "Semana/Ano inicial da geração obrigatório.";
    if (!semanaGerarFin || !anoGerarFin) e.semanaGerFin = "Semana/Ano final da geração obrigatório.";
    if (!alguemSelecionado) e.itens = "Selecione ao menos um item para gerar a previsão.";
    setErrors(e);
    return Object.keys(e).length === 0;
  }

  async function handlePesquisar() {
    setIsLoading(true);
    setFeedback(null);
    await new Promise((r) => setTimeout(r, 600));
    const idx = parseFloat(indiceProjecao) || 0;
    setItens(ITENS_MOCK.map((it) => ({
      ...it,
      projecao: aplicarProjecao(it.mediaHistorica, idx),
      selecionado: false,
    })));
    setIsLoading(false);
    setFeedback({ type: "info", message: `${ITENS_MOCK.length} item(ns) carregado(s) com base no histórico de ${historico === "pedidos" ? "Pedidos" : "Faturamento"}.` });
    setErrors({});
  }

  async function handleGerarPrevisao() {
    if (!validateGerar()) return;
    setIsGerando(true);
    setFeedback(null);
    await new Promise((r) => setTimeout(r, 800));
    const selecionados = itens.filter((it) => it.selecionado);
    setIsGerando(false);
    setFeedback({
      type: "success",
      message: `Previsão gerada com sucesso para ${selecionados.length} item(ns) nas semanas ${semanaGerarIni.padStart(2, "0")}/${anoGerarIni} a ${semanaGerarFin.padStart(2, "0")}/${anoGerarFin}. Disponível em VPRE0201.`,
    });
  }

  // ─── JSX ──────────────────────────────────────────────────────────────────

  return (
    <>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Inter:wght@300;400;500;600&display=swap');
        *, *::before, *::after { box-sizing: border-box; margin: 0; padding: 0; }

        .pre251-root {
          min-height: 100vh; background: #f0f4ee;
          font-family: 'Inter', sans-serif; color: #1a2e22;
          display: flex; flex-direction: column;
        }

        .pre251-topbar {
          height: 52px; background: #162e20;
          display: flex; align-items: center; justify-content: space-between;
          padding: 0 110px 0 20px; flex-shrink: 0;
          border-bottom: 1px solid rgba(62,150,84,0.15);
        }
        .pre251-topbar-left { display: flex; align-items: center; gap: 10px; }
        .pre251-logo-mark {
          width: 28px; height: 28px; background: #3e9654;
          border-radius: 6px; display: flex; align-items: center; justify-content: center;
        }
        .pre251-app-name { font-size: 13px; font-weight: 600; color: #e0f0e3; line-height: 1.1; }
        .pre251-app-sub  { display: block; font-size: 9px; font-weight: 400; color: #3d6b4d; }
        .pre251-screen-title {
          font-size: 12.5px; font-weight: 500; color: #5a9a6a;
          padding-left: 14px; margin-left: 14px;
          border-left: 1px solid rgba(255,255,255,0.08);
        }
        .pre251-screen-badge {
          font-size: 10px; font-weight: 700; letter-spacing: 0.8px;
          background: rgba(62,150,84,0.15); color: #7ecb8f;
          border: 1px solid rgba(62,150,84,0.25); border-radius: 5px;
          padding: 3px 8px;
        }

        .pre251-actionbar {
          background: #fff; border-bottom: 1px solid #dbe8d5;
          padding: 0 20px; display: flex; align-items: center;
          gap: 4px; height: 46px; flex-shrink: 0;
        }
        .pre251-action-group {
          display: flex; align-items: center; gap: 4px;
          padding-right: 12px; margin-right: 8px;
          border-right: 1px solid #e8f0e4;
        }
        .pre251-action-group:last-child { border-right: none; }
        .pre251-action-label {
          font-size: 9.5px; font-weight: 600; letter-spacing: 0.8px;
          text-transform: uppercase; color: #96b8a0; margin-right: 4px; white-space: nowrap;
        }
        .pre251-btn {
          display: inline-flex; align-items: center; gap: 6px;
          height: 32px; padding: 0 12px; border: 1.5px solid transparent;
          border-radius: 7px; font-family: 'Inter', sans-serif;
          font-size: 12.5px; font-weight: 500; cursor: pointer; white-space: nowrap;
          transition: background 0.13s, border-color 0.13s, color 0.13s;
        }
        .pre251-btn-primary { background: #162e20; color: #dff0e2; border-color: #162e20; }
        .pre251-btn-primary:hover:not(:disabled) { background: #1e3a2a; }
        .pre251-btn-primary:disabled { opacity: 0.5; cursor: not-allowed; }
        .pre251-btn-ghost { background: transparent; color: #4a7060; border-color: #d4e8d0; }
        .pre251-btn-ghost:hover:not(:disabled) { background: #f0f8ec; }
        .pre251-btn-ger {
          background: #1a4a8c; color: #dce8ff; border-color: #1a4a8c;
          font-weight: 700; font-size: 13px;
        }
        .pre251-btn-ger:hover:not(:disabled) { background: #1e5aaa; }
        .pre251-btn-ger:disabled { opacity: 0.5; cursor: not-allowed; }

        .pre251-body {
          flex: 1; padding: 16px 20px;
          display: flex; flex-direction: column; overflow-y: auto;
        }
        .pre251-body::-webkit-scrollbar { width: 5px; }
        .pre251-body::-webkit-scrollbar-thumb { background: #cce0c8; border-radius: 4px; }

        .pre251-section-banner {
          display: flex; align-items: center; gap: 10px; padding: 14px 0 8px;
        }
        .pre251-section-banner:first-child { padding-top: 0; }
        .pre251-section-banner-pill {
          font-size: 9.5px; font-weight: 700; letter-spacing: 1.2px;
          text-transform: uppercase; color: #5a8068;
          background: #e0ede0; border: 1px solid #c8dcc8;
          border-radius: 20px; padding: 3px 10px; white-space: nowrap;
        }
        .pre251-section-banner-line { flex: 1; height: 1px; background: #dbe8d5; }
        .pre251-section-banner-hint { font-size: 11px; color: #96b8a0; white-space: nowrap; }

        .pre251-card {
          background: #fff; border: 1px solid #dbe8d5;
          border-radius: 12px; overflow: hidden; margin-bottom: 14px;
        }
        .pre251-card-header {
          display: flex; align-items: center; justify-content: space-between;
          padding: 12px 18px; border-bottom: 1px solid #edf5e8; background: #fafcf9;
        }
        .pre251-card-header-left { display: flex; align-items: center; gap: 8px; }
        .pre251-card-title { font-size: 12px; font-weight: 600; color: #2a4a35; text-transform: uppercase; letter-spacing: 0.6px; }
        .pre251-card-body { padding: 18px; }

        .pre251-form-row { display: flex; gap: 14px; flex-wrap: wrap; align-items: flex-end; }
        .pre251-field { display: flex; flex-direction: column; gap: 5px; }
        .pre251-label {
          font-size: 10.5px; font-weight: 600; color: #5a8068;
          text-transform: uppercase; letter-spacing: 0.4px;
        }
        .pre251-label-req { color: #c84040; font-size: 12px; }
        .pre251-input {
          height: 36px; background: #f8fbf6;
          border: 1.5px solid #d4e8cc; border-radius: 7px;
          padding: 0 10px; font-family: 'Inter', sans-serif;
          font-size: 13px; color: #1a2e22; outline: none;
          transition: border-color 0.13s, box-shadow 0.13s;
        }
        .pre251-input:focus { border-color: #3e9654; box-shadow: 0 0 0 2px rgba(62,150,84,0.1); }
        .pre251-input::placeholder { color: #b0c8b8; font-size: 12px; }
        .pre251-input.has-error { border-color: #e05252; }
        .pre251-select {
          height: 36px; background: #f8fbf6;
          border: 1.5px solid #d4e8cc; border-radius: 7px;
          padding: 0 28px 0 10px; font-family: 'Inter', sans-serif;
          font-size: 13px; color: #1a2e22; outline: none; appearance: none; cursor: pointer;
          background-image: url("data:image/svg+xml,%3Csvg width='10' height='6' viewBox='0 0 10 6' xmlns='http://www.w3.org/2000/svg'%3E%3Cpath d='M1 1l4 4 4-4' stroke='%23789a84' stroke-width='1.5' fill='none' stroke-linecap='round' stroke-linejoin='round'/%3E%3C/svg%3E");
          background-repeat: no-repeat; background-position: right 10px center;
        }
        .pre251-select:focus { border-color: #3e9654; }
        .pre251-radio-group { display: flex; gap: 0; border: 1.5px solid #d4e8cc; border-radius: 7px; overflow: hidden; height: 36px; }
        .pre251-radio-opt {
          flex: 1; display: flex; align-items: center; justify-content: center;
          padding: 0 14px; font-size: 12.5px; cursor: pointer; transition: background 0.13s;
          border-right: 1px solid #d4e8cc; user-select: none; white-space: nowrap;
        }
        .pre251-radio-opt:last-child { border-right: none; }
        .pre251-radio-opt.active { background: #162e20; color: #dff0e2; font-weight: 600; }
        .pre251-radio-opt:not(.active):hover { background: #f0f8ec; }
        .pre251-semana-group { display: flex; align-items: center; gap: 6px; }
        .pre251-semana-sep { font-size: 14px; font-weight: 600; color: #96b8a0; }

        .pre251-field-error { font-size: 11px; color: #c84040; margin-top: 2px; }
        .pre251-field-hint  { font-size: 11px; color: #7a9c84; margin-top: 2px; }

        .pre251-feedback {
          display: flex; align-items: center; gap: 9px; padding: 11px 15px;
          border-radius: 9px; font-size: 13px; margin-bottom: 14px;
          animation: pre251FadeIn 0.2s ease;
        }
        .pre251-feedback.success { background: #f0faf2; border: 1px solid #b4dec0; color: #1e6030; }
        .pre251-feedback.error   { background: #fff5f5; border: 1px solid #f8c0c0; border-left: 3px solid #e05252; color: #b91c1c; }
        .pre251-feedback.info    { background: #f0f8ff; border: 1px solid #c7def8; border-left: 3px solid #4a90d9; color: #1a4070; }

        .pre251-nota-importante {
          display: flex; align-items: flex-start; gap: 10px;
          padding: 12px 15px; background: #fffbf0;
          border: 1px solid #f0dca0; border-left: 3px solid #e8b800;
          border-radius: 8px; font-size: 12px; color: #5a4000; line-height: 1.55;
          margin-bottom: 14px;
        }

        .pre251-table-wrap { overflow-x: auto; }
        .pre251-table { width: 100%; border-collapse: collapse; font-size: 13px; }
        .pre251-table th {
          background: #f4f9f2; padding: 8px 12px; text-align: left;
          font-size: 10.5px; font-weight: 700; color: #5a8068;
          text-transform: uppercase; letter-spacing: 0.5px;
          border-bottom: 1.5px solid #dbe8d5; white-space: nowrap;
        }
        .pre251-table th.num { text-align: right; }
        .pre251-table td { padding: 10px 12px; border-bottom: 1px solid #f0f6ec; color: #243830; vertical-align: middle; }
        .pre251-table td.num { text-align: right; font-variant-numeric: tabular-nums; }
        .pre251-table tbody tr:hover { background: #eef9f0; cursor: pointer; }
        .pre251-table tbody tr.sel { background: #dff5e4; }
        .pre251-table-empty { text-align: center; padding: 32px 12px; color: #96b8a0; font-size: 12.5px; }

        .pre251-check {
          width: 16px; height: 16px; cursor: pointer; accent-color: #3e9654;
        }
        .pre251-projecao-badge {
          display: inline-block; font-size: 11px; font-weight: 600;
          padding: 2px 7px; border-radius: 12px;
        }
        .pre251-projecao-pos { background: #e8f5e0; color: #2a6018; border: 1px solid #b4d898; }
        .pre251-projecao-neg { background: #fff0f0; color: #a01818; border: 1px solid #f0a8a8; }
        .pre251-projecao-zer { background: #f4f4f4; color: #6a8a74; border: 1px solid #d8e4d8; }

        .pre251-ger-area {
          display: flex; align-items: flex-end; gap: 16px; flex-wrap: wrap;
          padding: 14px 18px; background: #f0f8f0;
          border-top: 2px solid #dbe8d5;
        }
        .pre251-ger-title { font-size: 11px; font-weight: 700; color: #2a4a30; text-transform: uppercase; letter-spacing: 0.8px; margin-bottom: 10px; }

        .pre251-spinner {
          width: 14px; height: 14px; flex-shrink: 0;
          border: 2px solid rgba(223,240,226,0.3); border-top-color: #dff0e2;
          border-radius: 50%; animation: spin251 0.65s linear infinite;
        }
        .pre251-spinner-dark {
          width: 14px; height: 14px; flex-shrink: 0;
          border: 2px solid #d4e8cc; border-top-color: #3e9654;
          border-radius: 50%; animation: spin251 0.65s linear infinite;
        }

        .pre251-footer {
          background: #fff; border-top: 1px solid #dbe8d5;
          padding: 8px 20px; display: flex; align-items: center;
          justify-content: space-between; flex-shrink: 0;
        }
        .pre251-footer-stat { display: flex; align-items: center; gap: 6px; font-size: 11.5px; color: #6a8a74; }
        .pre251-footer-stat strong { color: #1a2e22; font-weight: 600; }

        @keyframes spin251 { to { transform: rotate(360deg); } }
        @keyframes pre251FadeIn { from { opacity: 0; transform: translateY(-4px); } to { opacity: 1; transform: translateY(0); } }
      `}</style>

      <div className="pre251-root">

        {/* ── TOPBAR ── */}
        <header className="pre251-topbar">
          <div className="pre251-topbar-left">
            <div className="pre251-logo-mark">
              <svg width="15" height="15" viewBox="0 0 18 18" fill="none">
                <rect x="1.5" y="1.5"   width="6" height="6" rx="1.2" fill="rgba(255,255,255,0.9)" />
                <rect x="10.5" y="1.5"  width="6" height="6" rx="1.2" fill="rgba(255,255,255,0.4)" />
                <rect x="1.5" y="10.5"  width="6" height="6" rx="1.2" fill="rgba(255,255,255,0.4)" />
                <rect x="10.5" y="10.5" width="6" height="6" rx="1.2" fill="rgba(255,255,255,0.7)" />
              </svg>
            </div>
            <span className="pre251-app-name">
              Venture <span className="pre251-app-sub">ERP &amp; Soluções</span>
            </span>
            <span className="pre251-screen-title">VPRE0251 — Geração de Previsão de Vendas</span>
          </div>
          <span className="pre251-screen-badge">PLANEJAMENTO</span>
        </header>

        {/* ── ACTION BAR ── */}
        <div className="pre251-actionbar">
          <div className="pre251-action-group">
            <span className="pre251-action-label">Pesquisa</span>
            <button type="button" className="pre251-btn pre251-btn-ghost" onClick={() => void handlePesquisar()} disabled={isLoading || isGerando}>
              {isLoading ? <span className="pre251-spinner-dark" /> : (
                <svg width="12" height="12" viewBox="0 0 16 16" fill="none">
                  <circle cx="6.5" cy="6.5" r="4.5" stroke="currentColor" strokeWidth="1.5" />
                  <path d="M10 10l3.5 3.5" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
                </svg>
              )}
              Pesquisar
            </button>
          </div>
          <div className="pre251-action-group">
            <button type="button" className="pre251-btn pre251-btn-ghost">
              <svg width="12" height="12" viewBox="0 0 14 14" fill="none">
                <circle cx="7" cy="7" r="5.5" stroke="currentColor" strokeWidth="1.4" />
                <path d="M7 4.5v3M7 9.5h.01" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" />
              </svg>
              Ajuda
            </button>
          </div>
        </div>

        {/* ── BODY ── */}
        <div className="pre251-body">

          {feedback && (
            <div className={`pre251-feedback ${feedback.type}`}>
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

          {/* ── NOTA IMPORTANTE ── */}
          <div className="pre251-nota-importante">
            <svg width="16" height="16" viewBox="0 0 16 16" fill="none" style={{ flexShrink: 0, marginTop: 1 }}>
              <path d="M8 2L1.5 13.5h13L8 2z" stroke="#e8b800" strokeWidth="1.4" strokeLinejoin="round" />
              <path d="M8 6v4M8 11.5h.01" stroke="#e8b800" strokeWidth="1.4" strokeLinecap="round" />
            </svg>
            <span>
              <strong>Importante:</strong> Quando marcado Histórico = Pedidos, seleciona os pedidos conforme os filtros da tela e que
              a situação do pedido seja <strong>liberada total</strong> (não bloqueado para nenhuma das liberações: Comercial, Financeiro,
              Itens Engenharia, Itens Processo, Itens Comercial). O status do pedido (Pendente, Atendido...) não é considerado para seleção.
            </span>
          </div>

          {/* ── SEÇÃO 1 — FILTROS ── */}
          <div className="pre251-section-banner">
            <span className="pre251-section-banner-pill">1 — Parâmetros</span>
            <div className="pre251-section-banner-line" />
            <span className="pre251-section-banner-hint">Período histórico e configurações da geração</span>
          </div>

          <div className="pre251-card">
            <div className="pre251-card-header">
              <div className="pre251-card-header-left">
                <svg width="14" height="14" viewBox="0 0 16 16" fill="none">
                  <rect x="2" y="2" width="12" height="12" rx="2" stroke="#3e9654" strokeWidth="1.4" />
                  <path d="M5 8h6M8 5v6" stroke="#3e9654" strokeWidth="1.4" strokeLinecap="round" />
                </svg>
                <span className="pre251-card-title">Configuração</span>
              </div>
            </div>
            <div className="pre251-card-body">

              {/* Linha 1: Histórico + Período */}
              <div className="pre251-form-row" style={{ marginBottom: 18 }}>
                <div className="pre251-field">
                  <label className="pre251-label">Histórico <span className="pre251-label-req">*</span></label>
                  <div className="pre251-radio-group" style={{ width: 240 }}>
                    <div className={`pre251-radio-opt${historico === "pedidos" ? " active" : ""}`} onClick={() => setHistorico("pedidos")}>
                      Pedidos de Venda
                    </div>
                    <div className={`pre251-radio-opt${historico === "faturamento" ? " active" : ""}`} onClick={() => setHistorico("faturamento")}>
                      Faturamento
                    </div>
                  </div>
                </div>

                <div className="pre251-field">
                  <label className="pre251-label">Período Histórico Inicial <span className="pre251-label-req">*</span></label>
                  <input
                    className={`pre251-input${errors.periodoIni ? " has-error" : ""}`}
                    style={{ width: 160 }} type="date"
                    value={periodoIni} onChange={(e) => setPeriodoIni(e.target.value)}
                  />
                  {errors.periodoIni && <span className="pre251-field-error">⚠ {errors.periodoIni}</span>}
                  <span className="pre251-field-hint">Selecionar {historico === "pedidos" ? "pedidos" : "notas fiscais"} a partir desta data.</span>
                </div>

                <div className="pre251-field">
                  <label className="pre251-label">Período Histórico Final <span className="pre251-label-req">*</span></label>
                  <input
                    className={`pre251-input${errors.periodoFin ? " has-error" : ""}`}
                    style={{ width: 160 }} type="date"
                    value={periodoFin} onChange={(e) => setPeriodoFin(e.target.value)}
                  />
                  {errors.periodoFin && <span className="pre251-field-error">⚠ {errors.periodoFin}</span>}
                </div>

                <div className="pre251-field">
                  <label className="pre251-label">Empresa</label>
                  <input className="pre251-input" style={{ width: 150 }} type="text" placeholder="Código..." value={empresa} onChange={(e) => setEmpresa(e.target.value)} />
                </div>
              </div>

              {/* Linha 2: Semana/Ano Geração + Índice */}
              <div className="pre251-form-row">
                <div className="pre251-field">
                  <label className="pre251-label">Semana/Ano Geração — Inicial <span className="pre251-label-req">*</span></label>
                  <div className="pre251-semana-group">
                    <input
                      className={`pre251-input${errors.semanaGerIni ? " has-error" : ""}`}
                      style={{ width: 70 }} type="number" min="1" max="53" placeholder="SS"
                      value={semanaGerarIni} onChange={(e) => setSemanaGerarIni(e.target.value)}
                    />
                    <span className="pre251-semana-sep">/</span>
                    <input
                      className={`pre251-input${errors.semanaGerIni ? " has-error" : ""}`}
                      style={{ width: 90 }} type="number" min="2000" max="2099" placeholder="AAAA"
                      value={anoGerarIni} onChange={(e) => setAnoGerarIni(e.target.value)}
                    />
                  </div>
                  {errors.semanaGerIni && <span className="pre251-field-error">⚠ {errors.semanaGerIni}</span>}
                  <span className="pre251-field-hint">Semana/Ano onde a previsão será gerada.</span>
                </div>

                <div className="pre251-field">
                  <label className="pre251-label">Semana/Ano Geração — Final <span className="pre251-label-req">*</span></label>
                  <div className="pre251-semana-group">
                    <input
                      className={`pre251-input${errors.semanaGerFin ? " has-error" : ""}`}
                      style={{ width: 70 }} type="number" min="1" max="53" placeholder="SS"
                      value={semanaGerarFin} onChange={(e) => setSemanaGerarFin(e.target.value)}
                    />
                    <span className="pre251-semana-sep">/</span>
                    <input
                      className={`pre251-input${errors.semanaGerFin ? " has-error" : ""}`}
                      style={{ width: 90 }} type="number" min="2000" max="2099" placeholder="AAAA"
                      value={anoGerarFin} onChange={(e) => setAnoGerarFin(e.target.value)}
                    />
                  </div>
                  {errors.semanaGerFin && <span className="pre251-field-error">⚠ {errors.semanaGerFin}</span>}
                </div>

                <div className="pre251-field">
                  <label className="pre251-label">Índice de Projeção (%)</label>
                  <div style={{ position: "relative" }}>
                    <input
                      className="pre251-input"
                      style={{ width: 120, paddingRight: 28 }}
                      type="number" step="0.01" placeholder="0,00"
                      value={indiceProjecao}
                      onChange={(e) => handleAtualizarProjecao(e.target.value)}
                    />
                    <span style={{ position: "absolute", right: 8, top: "50%", transform: "translateY(-50%)", fontSize: 11, color: "#7a9c84", pointerEvents: "none" }}>%</span>
                  </div>
                  <span className="pre251-field-hint">Crescimento desejado. 0% = média histórica pura.</span>
                </div>
              </div>
            </div>
          </div>

          {/* ── SEÇÃO 2 — ITENS ── */}
          <div className="pre251-section-banner">
            <span className="pre251-section-banner-pill">2 — Selecionar Itens</span>
            <div className="pre251-section-banner-line" />
            <span className="pre251-section-banner-hint">
              {itens.filter((it) => it.selecionado).length} de {itens.length} selecionado(s)
            </span>
          </div>

          <div className="pre251-card">
            <div className="pre251-card-header">
              <div className="pre251-card-header-left">
                <svg width="14" height="14" viewBox="0 0 16 16" fill="none">
                  <path d="M2 4h12M2 8h12M2 12h8" stroke="#3e9654" strokeWidth="1.4" strokeLinecap="round" />
                </svg>
                <span className="pre251-card-title">Itens para Previsão</span>
              </div>
              <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                <input
                  className="pre251-input" style={{ width: 220 }} type="text"
                  placeholder="Filtrar por item ou descrição..."
                  value={filtroItem} onChange={(e) => setFiltroItem(e.target.value)}
                />
              </div>
            </div>

            <div className="pre251-table-wrap">
              <table className="pre251-table">
                <thead>
                  <tr>
                    <th style={{ width: 48, textAlign: "center" }}>
                      <input
                        type="checkbox"
                        className="pre251-check"
                        checked={todosSelecionados && itens.length > 0}
                        onChange={handleToggleAll}
                        title="Selecionar todos"
                      />
                    </th>
                    <th>Item</th>
                    <th>Descrição</th>
                    <th style={{ width: 70 }}>Unidade</th>
                    <th className="num">Média Histórica</th>
                    <th className="num">Projeção ({indiceProjecao || "0"}%)</th>
                  </tr>
                </thead>
                <tbody>
                  {itensFiltrados.length === 0 ? (
                    <tr>
                      <td colSpan={6} className="pre251-table-empty">
                        Nenhum item encontrado. Clique em Pesquisar para carregar os dados.
                      </td>
                    </tr>
                  ) : itensFiltrados.map((it) => {
                    const idx = parseFloat(indiceProjecao) || 0;
                    const badgeClass = idx > 0 ? "pre251-projecao-pos" : idx < 0 ? "pre251-projecao-neg" : "pre251-projecao-zer";
                    return (
                      <tr key={it.id} className={it.selecionado ? "sel" : ""} onClick={() => handleToggleItem(it.id)}>
                        <td style={{ textAlign: "center" }}>
                          <input
                            type="checkbox" className="pre251-check"
                            checked={it.selecionado}
                            onChange={() => handleToggleItem(it.id)}
                            onClick={(e) => e.stopPropagation()}
                          />
                        </td>
                        <td><code style={{ background: "#edf5ea", padding: "2px 6px", borderRadius: 4, fontSize: 12 }}>{it.item}</code></td>
                        <td style={{ color: "#3a5a48" }}>{it.descricao}</td>
                        <td style={{ color: "#7a9c84" }}>{it.unidade}</td>
                        <td className="num">{it.mediaHistorica.toLocaleString("pt-BR")}</td>
                        <td className="num">
                          <span>{it.projecao.toLocaleString("pt-BR")}</span>
                          {idx !== 0 && (
                            <span className={`pre251-projecao-badge ${badgeClass}`} style={{ marginLeft: 8 }}>
                              {idx > 0 ? "+" : ""}{idx.toFixed(1)}%
                            </span>
                          )}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>

            {/* ── GER. PREV. ── */}
            <div className="pre251-ger-area">
              <div style={{ flex: 1 }}>
                <div className="pre251-ger-title">Geração da Previsão</div>
                <div style={{ fontSize: 12, color: "#5a7060", lineHeight: 1.6 }}>
                  {alguemSelecionado
                    ? `${itens.filter((it) => it.selecionado).length} item(ns) selecionado(s). A previsão será gerada para meses cheios nas semanas informadas.`
                    : "Selecione os itens acima para habilitar a geração."}
                </div>
                {errors.itens && <div style={{ fontSize: 11, color: "#b91c1c", marginTop: 4 }}>⚠ {errors.itens}</div>}
              </div>
              <button
                type="button"
                className="pre251-btn pre251-btn-ger"
                onClick={() => void handleGerarPrevisao()}
                disabled={isGerando || isLoading}
              >
                {isGerando ? <><span className="pre251-spinner" /> Gerando...</> : (
                  <>
                    <svg width="14" height="14" viewBox="0 0 16 16" fill="none">
                      <path d="M3 8h10M9 4l4 4-4 4" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" />
                    </svg>
                    Ger. Prev.
                  </>
                )}
              </button>
            </div>
          </div>
        </div>

        {/* ── FOOTER ── */}
        <footer className="pre251-footer">
          <div style={{ display: "flex", alignItems: "center", gap: 20 }}>
            <div className="pre251-footer-stat">
              Histórico: <strong>{historico === "pedidos" ? "Pedidos de Venda" : "Faturamento"}</strong>
            </div>
            <div className="pre251-footer-stat">
              Itens: <strong>{itens.filter((it) => it.selecionado).length}</strong> selecionado(s)
            </div>
            <div className="pre251-footer-stat">
              Índice: <strong>{indiceProjecao || "0"}%</strong>
            </div>
          </div>
          <div className="pre251-footer-stat" style={{ color: "#a0b8a8" }}>
            VPRE0251 · Planejamento
          </div>
        </footer>
      </div>
    </>
  );
}
