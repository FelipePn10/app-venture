import { useState, useCallback } from "react";
import { type OrientacaoEntregaResponse } from "@/services/orientacaoEntregaService";

// ─── Types ────────────────────────────────────────────────────────────────────

type FeedbackState = { type: "success" | "error" | "info"; message: string } | null;

interface FormOrientacao {
  responsavel: string;
  cliente: string;
  cep: string;
  endereco: string;
  bairro: string;
  cidade: string;
  uf: string;
  rota: string;
  orientacao: string;
  data: string;
}

const FORM_INICIAL: FormOrientacao = {
  responsavel: "",
  cliente: "",
  cep: "",
  endereco: "",
  bairro: "",
  cidade: "",
  uf: "",
  rota: "",
  orientacao: "",
  data: new Date().toISOString().substring(0, 10),
};

const MOCK_RESPONSAVEIS = [
  "001 – JOÃO SILVA",
  "002 – MARIA SOUZA",
  "003 – PEDRO COSTA",
];

const MOCK_ROTAS = [
  "R001 – CENTRO",
  "R002 – ZONA NORTE",
  "R003 – ZONA SUL",
  "R004 – GRANDE SP",
];

const MOCK_CEP_DATA: Record<string, { endereco: string; bairro: string; cidade: string; uf: string }> = {
  "01310100": { endereco: "Avenida Paulista, 1000", bairro: "Bela Vista", cidade: "São Paulo", uf: "SP" },
  "20040002": { endereco: "Rua do Ouvidor, 50", bairro: "Centro", cidade: "Rio de Janeiro", uf: "RJ" },
  "30130010": { endereco: "Avenida Afonso Pena, 500", bairro: "Centro", cidade: "Belo Horizonte", uf: "MG" },
};

// ─── Helpers ──────────────────────────────────────────────────────────────────

function normalizeErrorMessage(error: unknown, fallback: string): string {
  if (error && typeof error === "object" && "response" in error) {
    const resp = (error as any).response;
    if (resp?.data?.message) return String(resp.data.message);
  }
  if (error instanceof Error) return error.message;
  return fallback;
}

// ─── Component ────────────────────────────────────────────────────────────────

export function Vplc0211Page(): JSX.Element {
  const [form, setForm] = useState<FormOrientacao>(FORM_INICIAL);
  const [modoForm, setModoForm] = useState<"novo" | "edicao">("novo");

  // Search
  const [filtroData, setFiltroData] = useState("");
  const [filtroResponsavel, setFiltroResponsavel] = useState("");
  const [filtroCliente, setFiltroCliente] = useState("");
  const [filtroRota, setFiltroRota] = useState("");
  const [resultados, setResultados] = useState<OrientacaoEntregaResponse[]>([]);
  const [mostrarResultados, setMostrarResultados] = useState(false);

  const [isSaving, setIsSaving] = useState(false);
  const [isSearching, setIsSearching] = useState(false);
  const [feedback, setFeedback] = useState<FeedbackState>(null);

  const setField = useCallback(<K extends keyof FormOrientacao>(key: K, value: FormOrientacao[K]) => {
    setForm((prev) => ({ ...prev, [key]: value }));
    setFeedback(null);
  }, []);

  // ── CEP blur → auto-fills address fields
  async function handleCepBlur() {
    const cep = form.cep.replace(/\D/g, "");
    if (cep.length < 8) return;
    if (MOCK_CEP_DATA[cep]) {
      const data = MOCK_CEP_DATA[cep];
      setForm((prev) => ({ ...prev, endereco: data.endereco, bairro: data.bairro, cidade: data.cidade, uf: data.uf }));
      setFeedback({ type: "info", message: "Endereço preenchido automaticamente pelo CEP." });
    } else {
      setFeedback({ type: "info", message: "CEP não encontrado na base local." });
    }
  }

  function validate(): boolean {
    if (!form.responsavel) { setFeedback({ type: "error", message: "Responsável é obrigatório." }); return false; }
    if (!form.cliente.trim()) { setFeedback({ type: "error", message: "Cliente é obrigatório." }); return false; }
    if (!form.cep.trim()) { setFeedback({ type: "error", message: "CEP é obrigatório." }); return false; }
    if (!form.rota) { setFeedback({ type: "error", message: "Rota é obrigatória." }); return false; }
    return true;
  }

  async function handleSalvar() {
    if (!validate()) return;
    setIsSaving(true);
    setFeedback(null);
    try {
      await new Promise((r) => setTimeout(r, 800));
      setFeedback({ type: "success", message: `Orientação para cliente ${form.cliente} salva com sucesso.` });
    } catch (error) {
      setFeedback({ type: "error", message: normalizeErrorMessage(error, "Erro ao salvar.") });
    } finally { setIsSaving(false); }
  }

  async function handlePesquisar() {
    setIsSearching(true);
    setFeedback(null);
    try {
      await new Promise((r) => setTimeout(r, 600));
      const mock: OrientacaoEntregaResponse[] = [
        { responsavel: "001", responsavel_nome: "JOÃO SILVA", cliente: "001", cliente_nome: "SOHOME LTDA", cep: "01310100", endereco: "Av. Paulista, 1000", bairro: "Bela Vista", cidade: "São Paulo", uf: "SP", rota: "R001", rota_nome: "CENTRO", orientacao: "Entregar no 10º andar", data: "2026-05-12" },
        { responsavel: "002", responsavel_nome: "MARIA SOUZA", cliente: "002", cliente_nome: "ALFA S.A.", cep: "20040002", endereco: "Rua do Ouvidor, 50", bairro: "Centro", cidade: "Rio de Janeiro", uf: "RJ", rota: "R002", rota_nome: "ZONA NORTE", orientacao: "Agendar entrega com antecedência", data: "2026-05-11" },
      ];
      const filtered = mock.filter((r) => {
        if (filtroData && r.data !== filtroData) return false;
        if (filtroResponsavel && r.responsavel !== filtroResponsavel) return false;
        if (filtroCliente && !r.cliente_nome.toLowerCase().includes(filtroCliente.toLowerCase()) && r.cliente !== filtroCliente) return false;
        if (filtroRota && r.rota !== filtroRota) return false;
        return true;
      });
      setResultados(filtered);
      setMostrarResultados(true);
      if (filtered.length === 0) {
        setFeedback({ type: "info", message: "Nenhuma orientação encontrada para os filtros informados." });
      }
    } catch (error) {
      setFeedback({ type: "error", message: normalizeErrorMessage(error, "Erro ao pesquisar.") });
    } finally { setIsSearching(false); }
  }

  function handleSelectFromList(r: OrientacaoEntregaResponse) {
    setForm({
      responsavel: r.responsavel,
      cliente: r.cliente,
      cep: r.cep,
      endereco: r.endereco,
      bairro: r.bairro,
      cidade: r.cidade,
      uf: r.uf,
      rota: r.rota,
      orientacao: r.orientacao,
      data: r.data,
    });
    setFeedback(null);
    setModoForm("edicao");
    window.scrollTo({ top: document.body.scrollHeight, behavior: "smooth" });
  }

  function handleNovo() {
    setForm(FORM_INICIAL);
    setFeedback(null);
    setModoForm("novo");
  }

  function handleLimpar() {
    handleNovo();
    setMostrarResultados(false);
  }

  return (
    <>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Inter:wght@300;400;500;600&display=swap');
        *, *::before, *::after { box-sizing: border-box; margin: 0; padding: 0; }

        .plc-root {
          min-height: 100vh; background: #f0f4ee;
          font-family: 'Inter', sans-serif; color: #1a2e22;
          display: flex; flex-direction: column;
        }

        .plc-topbar {
          height: 52px; background: #162e20;
          display: flex; align-items: center; justify-content: space-between;
          padding: 0 20px; flex-shrink: 0;
          border-bottom: 1px solid rgba(62,150,84,0.15);
        }
        .plc-topbar-left { display: flex; align-items: center; gap: 10px; }
        .plc-logo-mark {
          width: 28px; height: 28px; background: #3e9654;
          border-radius: 6px; display: flex; align-items: center; justify-content: center;
        }
        .plc-app-name { font-size: 13px; font-weight: 600; color: #e0f0e3; line-height: 1.1; }
        .plc-app-sub  { display: block; font-size: 9px; font-weight: 400; color: #3d6b4d; }
        .plc-screen-title {
          font-size: 12.5px; font-weight: 500; color: #5a9a6a;
          padding-left: 14px; margin-left: 14px;
          border-left: 1px solid rgba(255,255,255,0.08);
        }

        .plc-actionbar {
          background: #fff; border-bottom: 1px solid #dbe8d5;
          padding: 0 20px; display: flex; align-items: center;
          gap: 4px; height: 46px; flex-shrink: 0;
        }
        .plc-action-group {
          display: flex; align-items: center; gap: 4px;
          padding-right: 12px; margin-right: 8px;
          border-right: 1px solid #e8f0e4;
        }
        .plc-action-group:last-child { border-right: none; }
        .plc-action-label {
          font-size: 9.5px; font-weight: 600; letter-spacing: 0.8px;
          text-transform: uppercase; color: #96b8a0; margin-right: 4px; white-space: nowrap;
        }
        .plc-btn {
          display: inline-flex; align-items: center; gap: 6px;
          height: 32px; padding: 0 12px; border: 1.5px solid transparent;
          border-radius: 7px; font-family: 'Inter', sans-serif;
          font-size: 12.5px; font-weight: 500; cursor: pointer; white-space: nowrap;
          transition: background 0.13s, border-color 0.13s, color 0.13s;
        }
        .plc-btn-primary { background: #162e20; color: #dff0e2; border-color: #162e20; }
        .plc-btn-primary:hover:not(:disabled) { background: #1e3a2a; }
        .plc-btn-primary:disabled { opacity: 0.5; cursor: not-allowed; }
        .plc-btn-ghost { background: transparent; color: #4a7060; border-color: #d4e8d0; }
        .plc-btn-ghost:hover:not(:disabled) { background: #f0f8ec; border-color: #b0d4b8; color: #1a3828; }
        .plc-btn-ghost:disabled { opacity: 0.5; cursor: not-allowed; }
        .plc-btn-danger { background: transparent; color: #b94040; border-color: #f0c8c8; }
        .plc-btn-danger:hover:not(:disabled) { background: #fff0f0; border-color: #e09090; }
        .plc-btn-sm { height: 28px; padding: 0 9px; font-size: 12px; }
        .plc-btn-new {
          background: #eef9f0; color: #1a6030; border-color: #b4d8b8; font-weight: 600;
        }
        .plc-btn-new:hover:not(:disabled) { background: #dff5e4; border-color: #88c898; }

        .plc-body {
          flex: 1; padding: 16px 20px; display: flex;
          flex-direction: column; gap: 0; overflow-y: auto;
        }
        .plc-body::-webkit-scrollbar { width: 5px; }
        .plc-body::-webkit-scrollbar-thumb { background: #cce0c8; border-radius: 4px; }

        .plc-section-banner {
          display: flex; align-items: center; gap: 10px;
          padding: 14px 0 8px;
        }
        .plc-section-banner:first-child { padding-top: 0; }
        .plc-section-banner-pill {
          font-size: 9.5px; font-weight: 700; letter-spacing: 1.2px;
          text-transform: uppercase; color: #5a8068;
          background: #e0ede0; border: 1px solid #c8dcc8;
          border-radius: 20px; padding: 3px 10px; white-space: nowrap;
        }
        .plc-section-banner-line { flex: 1; height: 1px; background: #dbe8d5; }
        .plc-section-banner-hint { font-size: 11px; color: #96b8a0; white-space: nowrap; }

        .plc-card {
          background: #fff; border: 1px solid #dbe8d5;
          border-radius: 12px; overflow: hidden; margin-bottom: 14px;
        }
        .plc-card-header {
          display: flex; align-items: center; justify-content: space-between;
          padding: 12px 18px; border-bottom: 1px solid #edf5e8; background: #fafcf9;
        }
        .plc-card-header-left { display: flex; align-items: center; gap: 8px; }
        .plc-card-title { font-size: 12px; font-weight: 600; color: #2a4a35; text-transform: uppercase; letter-spacing: 0.6px; }
        .plc-card-badge {
          font-size: 10.5px; font-weight: 500; color: #3e9654;
          background: #eef5ea; border: 1px solid #c4dfc8; border-radius: 12px; padding: 2px 8px;
        }
        .plc-card-body { padding: 18px 18px; }

        .plc-modo-novo {
          display: inline-flex; align-items: center; gap: 5px;
          font-size: 11px; font-weight: 600; padding: 3px 10px;
          border-radius: 20px; background: #e8f5e0; color: #1e5818;
          border: 1px solid #a8d898;
        }
        .plc-modo-edicao {
          display: inline-flex; align-items: center; gap: 5px;
          font-size: 11px; font-weight: 600; padding: 3px 10px;
          border-radius: 20px; background: #fff8e0; color: #7a5200;
          border: 1px solid #e0c860;
        }
        .plc-modo-dot { width: 6px; height: 6px; border-radius: 50%; flex-shrink: 0; }
        .plc-modo-novo  .plc-modo-dot { background: #3e9654; }
        .plc-modo-edicao .plc-modo-dot { background: #c8a020; }

        .plc-filter-row { display: flex; align-items: flex-end; gap: 12px; flex-wrap: wrap; }

        .plc-grid { display: grid; grid-template-columns: repeat(12, 1fr); gap: 16px 14px; align-items: start; }
        .plc-col-2  { grid-column: span 2; }
        .plc-col-3  { grid-column: span 3; }
        .plc-col-4  { grid-column: span 4; }
        .plc-col-5  { grid-column: span 5; }
        .plc-col-6  { grid-column: span 6; }
        .plc-col-8  { grid-column: span 8; }
        .plc-col-12 { grid-column: span 12; }

        .plc-field { display: flex; flex-direction: column; gap: 5px; }
        .plc-label {
          font-size: 10.5px; font-weight: 600; color: #5a8068;
          text-transform: uppercase; letter-spacing: 0.4px;
          display: flex; align-items: center; gap: 4px;
        }
        .plc-label-req { color: #c84040; font-size: 12px; line-height: 1; }
        .plc-input {
          width: 100%; height: 36px; background: #f8fbf6;
          border: 1.5px solid #d4e8cc; border-radius: 7px;
          padding: 0 10px; font-family: 'Inter', sans-serif;
          font-size: 13px; color: #1a2e22; outline: none;
          transition: border-color 0.13s, box-shadow 0.13s;
        }
        .plc-input:focus { border-color: #3e9654; box-shadow: 0 0 0 2px rgba(62,150,84,0.1); }
        .plc-input::placeholder { color: #b0c8b8; font-size: 12px; }
        .plc-input:disabled { background: #f0f4ee; color: #8aaa94; cursor: not-allowed; border-color: #e0ead8; }
        .plc-input[type="date"] { cursor: pointer; }

        .plc-textarea {
          width: 100%; min-height: 90px; background: #f8fbf6;
          border: 1.5px solid #d4e8cc; border-radius: 7px;
          padding: 10px; font-family: 'Inter', sans-serif;
          font-size: 13px; color: #1a2e22; outline: none; resize: vertical;
          transition: border-color 0.13s, box-shadow 0.13s;
        }
        .plc-textarea:focus { border-color: #3e9654; box-shadow: 0 0 0 2px rgba(62,150,84,0.1); }
        .plc-textarea::placeholder { color: #b0c8b8; font-size: 12px; }

        .plc-select {
          width: 100%; height: 36px; background: #f8fbf6;
          border: 1.5px solid #d4e8cc; border-radius: 7px;
          padding: 0 28px 0 10px; font-family: 'Inter', sans-serif;
          font-size: 13px; color: #1a2e22; outline: none;
          appearance: none; cursor: pointer;
          background-image: url("data:image/svg+xml,%3Csvg width='10' height='6' viewBox='0 0 10 6' xmlns='http://www.w3.org/2000/svg'%3E%3Cpath d='M1 1l4 4 4-4' stroke='%23789a84' stroke-width='1.5' fill='none' stroke-linecap='round' stroke-linejoin='round'/%3E%3C/svg%3E");
          background-repeat: no-repeat; background-position: right 10px center;
          transition: border-color 0.13s;
        }
        .plc-select:focus { border-color: #3e9654; box-shadow: 0 0 0 2px rgba(62,150,84,0.1); }

        .plc-field-hint { font-size: 11px; color: #7a9c84; margin-top: 2px; line-height: 1.45; }

        .plc-results-wrap { border-top: 1px solid #edf5e8; overflow-x: auto; }
        .plc-results-bar {
          display: flex; align-items: center; justify-content: space-between;
          padding: 10px 18px; background: #f4f9f2; border-bottom: 1px solid #e8f0e4;
        }
        .plc-results-bar-left { display: flex; align-items: center; gap: 8px; }
        .plc-results-bar-label { font-size: 11px; font-weight: 600; color: #4a7060; text-transform: uppercase; letter-spacing: 0.5px; }
        .plc-results-hint { font-size: 11px; color: #96b8a0; }
        .plc-results-table { width: 100%; border-collapse: collapse; font-size: 13px; }
        .plc-results-table th {
          background: #f4f9f2; padding: 8px 12px; text-align: left;
          font-size: 10.5px; font-weight: 700; color: #5a8068;
          text-transform: uppercase; letter-spacing: 0.5px;
          border-bottom: 1.5px solid #dbe8d5; white-space: nowrap;
        }
        .plc-results-table td { padding: 9px 12px; border-bottom: 1px solid #f0f6ec; color: #243830; vertical-align: middle; }
        .plc-results-table tbody tr { cursor: pointer; transition: background 0.1s; }
        .plc-results-table tbody tr:hover { background: #eef9f0; }
        .plc-results-empty { text-align: center; padding: 28px 12px; color: #96b8a0; font-size: 12.5px; }

        .plc-feedback {
          display: flex; align-items: center; gap: 9px; padding: 11px 15px;
          border-radius: 9px; font-size: 13px; animation: plcFadeIn 0.2s ease;
          margin-bottom: 14px;
        }
        .plc-feedback.success { background: #f0faf2; border: 1px solid #b4dec0; color: #1e6030; }
        .plc-feedback.error   { background: #fff5f5; border: 1px solid #f8c0c0; border-left: 3px solid #e05252; color: #b91c1c; }
        .plc-feedback.info    { background: #f0f8ff; border: 1px solid #c7def8; border-left: 3px solid #4a90d9; color: #1a4070; }

        .plc-section-sep { height: 1px; background: #edf5e8; margin: 20px 0; }

        .plc-footer {
          background: #fff; border-top: 1px solid #dbe8d5;
          padding: 8px 20px; display: flex; align-items: center;
          justify-content: space-between; flex-shrink: 0;
        }
        .plc-footer-left { display: flex; align-items: center; gap: 20px; }
        .plc-footer-stat { display: flex; align-items: center; gap: 6px; font-size: 11.5px; color: #6a8a74; }
        .plc-footer-stat strong { color: #1a2e22; font-weight: 600; }

        @keyframes spin { to { transform: rotate(360deg); } }
        .plc-spinner {
          width: 14px; height: 14px; flex-shrink: 0;
          border: 2px solid rgba(223,240,226,0.3); border-top-color: #dff0e2;
          border-radius: 50%; animation: spin 0.65s linear infinite;
        }
        .plc-spinner-dark {
          width: 14px; height: 14px; flex-shrink: 0;
          border: 2px solid #d4e8cc; border-top-color: #3e9654;
          border-radius: 50%; animation: spin 0.65s linear infinite;
        }
        @keyframes plcFadeIn { from { opacity: 0; transform: translateY(-4px); } to { opacity: 1; transform: translateY(0); } }
      `}</style>

      <div className="plc-root">

        {/* TOPBAR */}
        <header className="plc-topbar">
          <div className="plc-topbar-left">
            <div className="plc-logo-mark">
              <svg width="15" height="15" viewBox="0 0 18 18" fill="none">
                <rect x="1.5" y="1.5" width="6" height="6" rx="1.2" fill="rgba(255,255,255,0.9)" />
                <rect x="10.5" y="1.5" width="6" height="6" rx="1.2" fill="rgba(255,255,255,0.4)" />
                <rect x="1.5" y="10.5" width="6" height="6" rx="1.2" fill="rgba(255,255,255,0.4)" />
                <rect x="10.5" y="10.5" width="6" height="6" rx="1.2" fill="rgba(255,255,255,0.7)" />
              </svg>
            </div>
            <span className="plc-app-name">
              Venture<span className="plc-app-sub">ERP &amp; Soluções</span>
            </span>
            <span className="plc-screen-title">VPLC0211 — Cadastro de Orientações de Entrega</span>
          </div>
        </header>

        {/* ACTION BAR */}
        <div className="plc-actionbar">
          <div className="plc-action-group">
            <span className="plc-action-label">Cadastro</span>
            <button className="plc-btn plc-btn-new" onClick={handleNovo} disabled={isSaving || isSearching}>
              <svg width="12" height="12" viewBox="0 0 12 12" fill="none">
                <path d="M6 2v8M2 6h8" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" />
              </svg>
              Nova Orientação
            </button>
          </div>
          <div className="plc-action-group">
            <span className="plc-action-label">Ações</span>
            <button className="plc-btn plc-btn-primary" onClick={() => void handleSalvar()} disabled={isSaving}>
              {isSaving
                ? <><div className="plc-spinner" />Salvando...</>
                : <>
                    <svg width="13" height="13" viewBox="0 0 16 16" fill="none">
                      <path d="M2 2h9l3 3v9a1 1 0 01-1 1H3a1 1 0 01-1-1V3a1 1 0 011-1z" stroke="currentColor" strokeWidth="1.4" strokeLinejoin="round" />
                      <path d="M5 2v4h6V2M5 9h6" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" />
                    </svg>
                    Salvar
                  </>
              }
            </button>
            <button className="plc-btn plc-btn-danger" onClick={handleLimpar} disabled={isSaving || isSearching}>
              <svg width="13" height="13" viewBox="0 0 16 16" fill="none">
                <path d="M3 3l10 10M13 3L3 13" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
              </svg>
              Limpar
            </button>
          </div>
          <div className="plc-action-group">
            <button className="plc-btn plc-btn-ghost">
              <svg width="13" height="13" viewBox="0 0 16 16" fill="none">
                <circle cx="8" cy="8" r="6" stroke="currentColor" strokeWidth="1.4" />
                <path d="M8 7v4M8 5.5h.01" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" />
              </svg>
              Ajuda
            </button>
          </div>
        </div>

        {/* BODY */}
        <div className="plc-body">

          {feedback && (
            <div className={`plc-feedback ${feedback.type}`}>
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

          {/* SEÇÃO 1 — PESQUISAR */}
          <div className="plc-section-banner">
            <span className="plc-section-banner-pill">1 — Pesquisar</span>
            <div className="plc-section-banner-line" />
            <span className="plc-section-banner-hint">Filtre e clique em um registro para carregá-lo no formulário abaixo</span>
          </div>

          <div className="plc-card">
            <div className="plc-card-header">
              <div className="plc-card-header-left">
                <svg width="14" height="14" viewBox="0 0 16 16" fill="none">
                  <circle cx="6.5" cy="6.5" r="4.5" stroke="#3e9654" strokeWidth="1.4" />
                  <path d="M10 10l3.5 3.5" stroke="#3e9654" strokeWidth="1.4" strokeLinecap="round" />
                </svg>
                <span className="plc-card-title">Pesquisa de Orientações de Entrega</span>
              </div>
            </div>
            <div className="plc-card-body" style={{ paddingBottom: 14 }}>
              <div className="plc-filter-row">
                <div className="plc-field" style={{ flex: "0 0 180px" }}>
                  <label className="plc-label">Data</label>
                  <input type="date" className="plc-input" value={filtroData} onChange={(e) => setFiltroData(e.target.value)} />
                </div>
                <div className="plc-field" style={{ flex: "0 0 200px" }}>
                  <label className="plc-label">Responsável</label>
                  <select className="plc-select" value={filtroResponsavel} onChange={(e) => setFiltroResponsavel(e.target.value)}>
                    <option value="">Todos</option>
                    {MOCK_RESPONSAVEIS.map((r) => <option key={r} value={r}>{r}</option>)}
                  </select>
                </div>
                <div className="plc-field" style={{ flex: "0 0 200px" }}>
                  <label className="plc-label">Cliente</label>
                  <input className="plc-input" placeholder="Código ou nome" value={filtroCliente} onChange={(e) => setFiltroCliente(e.target.value)} onKeyDown={(e) => e.key === "Enter" && void handlePesquisar()} />
                </div>
                <div className="plc-field" style={{ flex: "0 0 200px" }}>
                  <label className="plc-label">Rota</label>
                  <select className="plc-select" value={filtroRota} onChange={(e) => setFiltroRota(e.target.value)}>
                    <option value="">Todas</option>
                    {MOCK_ROTAS.map((r) => <option key={r} value={r}>{r}</option>)}
                  </select>
                </div>
                <div style={{ alignSelf: "flex-end" }}>
                  <button className="plc-btn plc-btn-ghost" onClick={() => void handlePesquisar()} disabled={isSearching}>
                    {isSearching
                      ? <><div className="plc-spinner-dark" />Buscando...</>
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
              </div>
            </div>

            {mostrarResultados && (
              <div className="plc-results-wrap">
                <div className="plc-results-bar">
                  <div className="plc-results-bar-left">
                    <svg width="13" height="13" viewBox="0 0 16 16" fill="none">
                      <path d="M2 4h12M2 8h12M2 12h8" stroke="#5a8068" strokeWidth="1.4" strokeLinecap="round" />
                    </svg>
                    <span className="plc-results-bar-label">Resultados</span>
                    <span className="plc-card-badge">{resultados.length} registro(s)</span>
                  </div>
                  <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                    <span className="plc-results-hint">Clique em um registro para editar</span>
                    <button className="plc-btn plc-btn-ghost plc-btn-sm" onClick={() => setMostrarResultados(false)}>Fechar</button>
                  </div>
                </div>
                {resultados.length === 0 ? (
                  <div className="plc-results-empty">Nenhuma orientação encontrada para os filtros informados.</div>
                ) : (
                  <table className="plc-results-table">
                    <thead>
                      <tr>
                        <th style={{ width: 100 }}>Data</th>
                        <th>Cliente</th>
                        <th>Responsável</th>
                        <th>Cidade/UF</th>
                        <th>Rota</th>
                      </tr>
                    </thead>
                    <tbody>
                      {resultados.map((r, i) => (
                        <tr key={i} onClick={() => handleSelectFromList(r)}>
                          <td style={{ fontWeight: 600, color: "#1a4a2a" }}>{r.data}</td>
                          <td>{r.cliente} – {r.cliente_nome}</td>
                          <td>{r.responsavel_nome}</td>
                          <td>{r.cidade}/{r.uf}</td>
                          <td>{r.rota_nome}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                )}
              </div>
            )}
          </div>

          {/* SEÇÃO 2 — CRIAR / EDITAR */}
          <div className="plc-section-banner">
            <span className="plc-section-banner-pill">2 — Criar / Editar</span>
            <div className="plc-section-banner-line" />
            <span className="plc-section-banner-hint">
              {modoForm === "novo"
                ? "Preencha os campos e clique em Salvar"
                : "Editando orientação — clique em Nova Orientação para cancelar"}
            </span>
          </div>

          <div className="plc-card">
            <div className="plc-card-header">
              <div className="plc-card-header-left">
                <svg width="14" height="14" viewBox="0 0 16 16" fill="none">
                  <path d="M2 2h9l3 3v9a1 1 0 01-1 1H3a1 1 0 01-1-1V3a1 1 0 011-1z" stroke="#3e9654" strokeWidth="1.4" strokeLinejoin="round" />
                  <path d="M5 2v4h6V2M5 9h6" stroke="#3e9654" strokeWidth="1.4" strokeLinecap="round" />
                </svg>
                <span className="plc-card-title">Orientação de Entrega</span>
              </div>
              {modoForm === "novo"
                ? <span className="plc-modo-novo"><span className="plc-modo-dot" />Novo Cadastro</span>
                : <span className="plc-modo-edicao"><span className="plc-modo-dot" />Editando</span>
              }
            </div>
            <div className="plc-card-body">
              <div className="plc-grid">
                {/* Data */}
                <div className="plc-field plc-col-2">
                  <label className="plc-label">Data</label>
                  <input type="date" className="plc-input" value={form.data} disabled />
                  <span className="plc-field-hint">Preenchido automaticamente.</span>
                </div>

                {/* Responsável */}
                <div className="plc-field plc-col-3">
                  <label className="plc-label">Responsável <span className="plc-label-req">*</span></label>
                  <select className="plc-select" value={form.responsavel} onChange={(e) => setField("responsavel", e.target.value)}>
                    <option value="">Selecione...</option>
                    {MOCK_RESPONSAVEIS.map((r) => <option key={r} value={r}>{r}</option>)}
                  </select>
                </div>

                {/* Cliente */}
                <div className="plc-field plc-col-3">
                  <label className="plc-label">Cliente <span className="plc-label-req">*</span></label>
                  <input className="plc-input" placeholder="Código do cliente" value={form.cliente} onChange={(e) => setField("cliente", e.target.value)} maxLength={20} />
                </div>

                {/* CEP */}
                <div className="plc-field plc-col-2">
                  <label className="plc-label">CEP <span className="plc-label-req">*</span></label>
                  <input
                    className="plc-input"
                    placeholder="00000-000"
                    value={form.cep}
                    onChange={(e) => setField("cep", e.target.value)}
                    onBlur={() => void handleCepBlur()}
                    maxLength={9}
                  />
                  <span className="plc-field-hint">Ao sair do campo, busca endereço.</span>
                </div>

                {/* Rota */}
                <div className="plc-field plc-col-2">
                  <label className="plc-label">Rota <span className="plc-label-req">*</span></label>
                  <select className="plc-select" value={form.rota} onChange={(e) => setField("rota", e.target.value)}>
                    <option value="">Selecione...</option>
                    {MOCK_ROTAS.map((r) => <option key={r} value={r}>{r}</option>)}
                  </select>
                </div>
              </div>

              <div className="plc-section-sep" />

              {/* Endereço */}
              <div className="plc-grid">
                <div className="plc-field plc-col-5">
                  <label className="plc-label">Endereço</label>
                  <input className="plc-input" placeholder="Logradouro, número" value={form.endereco} onChange={(e) => setField("endereco", e.target.value)} />
                </div>
                <div className="plc-field plc-col-4">
                  <label className="plc-label">Bairro</label>
                  <input className="plc-input" placeholder="Bairro" value={form.bairro} onChange={(e) => setField("bairro", e.target.value)} />
                </div>
                <div className="plc-field plc-col-2">
                  <label className="plc-label">Cidade</label>
                  <input className="plc-input" value={form.cidade} disabled />
                </div>
                <div className="plc-field plc-col-1">
                  <label className="plc-label">UF</label>
                  <input className="plc-input" value={form.uf} disabled style={{ textAlign: "center" }} />
                </div>
              </div>

              <div className="plc-section-sep" />

              {/* Orientação */}
              <div className="plc-grid">
                <div className="plc-field plc-col-12">
                  <label className="plc-label">Orientação</label>
                  <textarea
                    className="plc-textarea"
                    placeholder="Descreva as orientações de entrega para o transportador..."
                    value={form.orientacao}
                    onChange={(e) => setField("orientacao", e.target.value)}
                    rows={4}
                    maxLength={500}
                  />
                  <span className="plc-field-hint">Instruções específicas para a entrega (máx. 500 caracteres).</span>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* FOOTER */}
        <footer className="plc-footer">
          <div className="plc-footer-left">
            <div className="plc-footer-stat">Módulo: <strong>Planejamento</strong></div>
          </div>
          <div className="plc-footer-stat" style={{ gap: 8 }}>
            <span style={{ color: "#b0c8b8", fontSize: 11 }}>GRUPO VENTURE LTDA</span>
          </div>
        </footer>
      </div>
    </>
  );
}
