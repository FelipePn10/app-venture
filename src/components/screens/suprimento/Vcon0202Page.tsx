import { useState, useCallback } from "react";
import { cancelarItens, type CancelamentoItemDTO } from "@/services/contratosService";

// ─── Types ────────────────────────────────────────────────────────────────────

type FeedbackState = { type: "success" | "error" | "info"; message: string } | null;

interface CancelamentoItem {
  codigo: string;
  descricao: string;
  tipo: "Cancelar" | "Descancelar";
  motivo: string;
  quantidade: number;
  solicitada: string;
  atendimento: string;
  recebimento: string;
  historico: Array<{ data: string; qtde: number; tipo: string; usuario: string; motivo: string }>;
}

interface CancelamentoForm {
  contrato: string;
  cancela_todos: boolean;
  descancela_todos: boolean;
}

const FORM_INICIAL: CancelamentoForm = { contrato: "", cancela_todos: false, descancela_todos: false };

const MOTIVOS = [
  "Quebra de contrato",
  "Fornecedor não entregou",
  "Pedido duplicado",
  "Alteração de escopo",
  "Cancelamento pelo cliente",
  "Erro no pedido",
];

const MOCK_ITENS: CancelamentoItem[] = [
  {
    codigo: "001", descricao: "Parafuso M8", tipo: "Cancelar", motivo: "Quebra de contrato",
    quantidade: 100, solicitada: "Atendida", atendimento: "Atendida", recebimento: "Cancelada",
    historico: [{ data: "2025-03-10", qtde: 100, tipo: "Cancelar", usuario: "Admin", motivo: "Quebra de contrato" }],
  },
  {
    codigo: "002", descricao: "Arruela 10mm", tipo: "Descancelar", motivo: "Alteração de escopo",
    quantidade: 50, solicitada: "Cancelada", atendimento: "Saldo", recebimento: "Saldo",
    historico: [{ data: "2025-03-12", qtde: 50, tipo: "Descancelar", usuario: "Gerente", motivo: "Alteração de escopo" }],
  },
  {
    codigo: "003", descricao: "Porca M8", tipo: "Cancelar", motivo: "Erro no pedido",
    quantidade: 200, solicitada: "Atendida", atendimento: "Cancelada", recebimento: "Atendida",
    historico: [
      { data: "2025-02-20", qtde: 200, tipo: "Cancelar", usuario: "Op. Logística", motivo: "Erro no pedido" },
      { data: "2025-03-01", qtde: 100, tipo: "Descancelar", usuario: "Admin", motivo: "Reversão parcial" },
    ],
  },
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

function formatDateBR(iso: string): string {
  if (!iso || iso.length < 10) return "—";
  const [y, m, d] = iso.substring(0, 10).split("-");
  return `${d}/${m}/${y}`;
}

// ─── Component ────────────────────────────────────────────────────────────────

export function Vcon0202Page(): JSX.Element {
  const [form, setForm] = useState<CancelamentoForm>(FORM_INICIAL);
  const [itens, setItens] = useState<CancelamentoItem[]>([]);
  const [feedback, setFeedback] = useState<FeedbackState>(null);
  const [isSaving, setIsSaving] = useState(false);
  const [isLoading, setIsLoading] = useState(false);

  const setField = useCallback(<K extends keyof CancelamentoForm>(key: K, value: CancelamentoForm[K]) => {
    setForm((p) => ({ ...p, [key]: value }));
    setFeedback(null);
  }, []);

  function updateItem(codigo: string, field: keyof CancelamentoItem, value: string) {
    setItens((prev) =>
      prev.map((it) => (it.codigo === codigo ? { ...it, [field]: value } : it))
    );
  }

  async function handleCarregar() {
    if (!form.contrato.trim()) {
      setFeedback({ type: "error", message: "Informe um contrato." });
      return;
    }
    setIsLoading(true);
    setFeedback(null);
    try {
      await new Promise((r) => setTimeout(r, 800));
      setItens(MOCK_ITENS);
      setFeedback({ type: "success", message: `${MOCK_ITENS.length} item(ns) carregado(s) para o contrato ${form.contrato}.` });
    } catch (error) {
      setFeedback({ type: "error", message: normalizeError(error, "Erro ao carregar itens.") });
    } finally {
      setIsLoading(false);
    }
  }

  async function handleSalvar() {
    if (!form.contrato.trim()) {
      setFeedback({ type: "error", message: "Informe um contrato." });
      return;
    }
    if (itens.length === 0) {
      setFeedback({ type: "error", message: "Nenhum item para salvar." });
      return;
    }
    setIsSaving(true);
    setFeedback(null);
    try {
      const dto: CancelamentoItemDTO = {
        cancela_todos: form.cancela_todos,
        descancela_todos: form.descancela_todos,
        itens: itens.map((it) => ({
          codigo: it.codigo,
          tipo: it.tipo,
          motivo: it.motivo,
          quantidade: it.quantidade,
        })),
      };
      await cancelarItens(dto);
      setFeedback({ type: "success", message: `${itens.length} item(ns) processado(s) com sucesso.` });
    } catch (error) {
      setFeedback({ type: "error", message: normalizeError(error, "Erro ao processar cancelamentos.") });
    } finally {
      setIsSaving(false);
    }
  }

  function handleLimpar() {
    setForm(FORM_INICIAL);
    setItens([]);
    setFeedback(null);
  }

  function applyCancelaTodos() {
    setItens((prev) => prev.map((it) => ({ ...it, tipo: "Cancelar" as const })));
  }

  function applyDescancelaTodos() {
    setItens((prev) => prev.map((it) => ({ ...it, tipo: "Descancelar" as const })));
  }

  return (
    <>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Inter:wght@300;400;500;600&display=swap');
        *, *::before, *::after { box-sizing: border-box; margin: 0; padding: 0; }

        .con4-root {
          min-height: 100vh; background: #f0f4ee;
          font-family: 'Inter', sans-serif; color: #1a2e22;
          display: flex; flex-direction: column;
        }

        .con4-topbar {
          height: 52px; background: #162e20;
          display: flex; align-items: center; justify-content: space-between;
          padding: 0 20px; flex-shrink: 0;
          border-bottom: 1px solid rgba(62,150,84,0.15);
        }
        .con4-topbar-left { display: flex; align-items: center; gap: 10px; }
        .con4-logo-mark {
          width: 28px; height: 28px; background: #3e9654;
          border-radius: 6px; display: flex; align-items: center; justify-content: center;
        }
        .con4-app-name { font-size: 13px; font-weight: 600; color: #e0f0e3; line-height: 1.1; }
        .con4-app-sub  { display: block; font-size: 9px; font-weight: 400; color: #3d6b4d; }
        .con4-screen-title {
          font-size: 12.5px; font-weight: 500; color: #5a9a6a;
          padding-left: 14px; margin-left: 14px;
          border-left: 1px solid rgba(255,255,255,0.08);
        }

        .con4-actionbar {
          background: #fff; border-bottom: 1px solid #dbe8d5;
          padding: 0 20px; display: flex; align-items: center;
          gap: 4px; height: 46px; flex-shrink: 0;
        }
        .con4-action-group {
          display: flex; align-items: center; gap: 4px;
          padding-right: 12px; margin-right: 8px;
          border-right: 1px solid #e8f0e4;
        }
        .con4-action-group:last-child { border-right: none; }
        .con4-action-label {
          font-size: 9.5px; font-weight: 600; letter-spacing: 0.8px;
          text-transform: uppercase; color: #96b8a0; margin-right: 4px; white-space: nowrap;
        }
        .con4-btn {
          display: inline-flex; align-items: center; gap: 6px;
          height: 32px; padding: 0 12px; border: 1.5px solid transparent;
          border-radius: 7px; font-family: 'Inter', sans-serif;
          font-size: 12.5px; font-weight: 500; cursor: pointer; white-space: nowrap;
          transition: background 0.13s, border-color 0.13s, color 0.13s;
        }
        .con4-btn-primary { background: #162e20; color: #dff0e2; border-color: #162e20; }
        .con4-btn-primary:hover:not(:disabled) { background: #1e3a2a; }
        .con4-btn-primary:disabled { opacity: 0.5; cursor: not-allowed; }
        .con4-btn-ghost { background: transparent; color: #4a7060; border-color: #d4e8d0; }
        .con4-btn-ghost:hover:not(:disabled) { background: #f0f8ec; border-color: #b0d4b8; color: #1a3828; }
        .con4-btn-danger { background: transparent; color: #b94040; border-color: #f0c8c8; }
        .con4-btn-danger:hover:not(:disabled) { background: #fff0f0; border-color: #e09090; }

        .con4-body {
          flex: 1; padding: 16px 20px; display: flex;
          flex-direction: column; gap: 0; overflow-y: auto;
        }
        .con4-body::-webkit-scrollbar { width: 5px; }
        .con4-body::-webkit-scrollbar-thumb { background: #cce0c8; border-radius: 4px; }

        .con4-section-banner {
          display: flex; align-items: center; gap: 10px;
          padding: 14px 0 8px;
        }
        .con4-section-banner:first-child { padding-top: 0; }
        .con4-section-banner-pill {
          font-size: 9.5px; font-weight: 700; letter-spacing: 1.2px;
          text-transform: uppercase; color: #5a8068;
          background: #e0ede0; border: 1px solid #c8dcc8;
          border-radius: 20px; padding: 3px 10px; white-space: nowrap;
        }
        .con4-section-banner-line { flex: 1; height: 1px; background: #dbe8d5; }
        .con4-section-banner-hint { font-size: 11px; color: #96b8a0; white-space: nowrap; }

        .con4-card {
          background: #fff; border: 1px solid #dbe8d5;
          border-radius: 12px; overflow: hidden; margin-bottom: 14px;
        }
        .con4-card-header {
          display: flex; align-items: center; justify-content: space-between;
          padding: 12px 18px; border-bottom: 1px solid #edf5e8; background: #fafcf9;
        }
        .con4-card-header-left { display: flex; align-items: center; gap: 8px; }
        .con4-card-title { font-size: 12px; font-weight: 600; color: #2a4a35; text-transform: uppercase; letter-spacing: 0.6px; }
        .con4-card-badge {
          font-size: 10.5px; font-weight: 500; color: #3e9654;
          background: #eef5ea; border: 1px solid #c4dfc8; border-radius: 12px; padding: 2px 8px;
        }
        .con4-card-body { padding: 18px 18px; }

        .con4-filter-row { display: flex; align-items: flex-end; gap: 12px; flex-wrap: wrap; }

        .con4-field { display: flex; flex-direction: column; gap: 5px; }
        .con4-label {
          font-size: 10.5px; font-weight: 600; color: #5a8068;
          text-transform: uppercase; letter-spacing: 0.4px;
        }
        .con4-input {
          width: 100%; height: 36px; background: #f8fbf6;
          border: 1.5px solid #d4e8cc; border-radius: 7px;
          padding: 0 10px; font-family: 'Inter', sans-serif;
          font-size: 13px; color: #1a2e22; outline: none;
          transition: border-color 0.13s, box-shadow 0.13s;
        }
        .con4-input:focus { border-color: #3e9654; box-shadow: 0 0 0 2px rgba(62,150,84,0.1); }
        .con4-input::placeholder { color: #b0c8b8; font-size: 12px; }
        .con4-input:disabled { background: #f0f4ee; color: #8aaa94; cursor: not-allowed; border-color: #e0ead8; }

        .con4-select {
          width: 100%; height: 36px; background: #f8fbf6;
          border: 1.5px solid #d4e8cc; border-radius: 7px;
          padding: 0 28px 0 10px; font-family: 'Inter', sans-serif;
          font-size: 13px; color: #1a2e22; outline: none;
          appearance: none; cursor: pointer;
          background-image: url("data:image/svg+xml,%3Csvg width='10' height='6' viewBox='0 0 10 6' xmlns='http://www.w3.org/2000/svg'%3E%3Cpath d='M1 1l4 4 4-4' stroke='%23789a84' stroke-width='1.5' fill='none' stroke-linecap='round' stroke-linejoin='round'/%3E%3C/svg%3E");
          background-repeat: no-repeat; background-position: right 10px center;
          transition: border-color 0.13s;
        }
        .con4-select:focus { border-color: #3e9654; box-shadow: 0 0 0 2px rgba(62,150,84,0.1); }

        .con4-input-wrap { position: relative; display: flex; }
        .con4-input-btn {
          height: 36px; padding: 0 12px; flex-shrink: 0;
          background: #edf5ea; border: 1.5px solid #d4e8cc; border-left: none;
          border-radius: 0 7px 7px 0; display: flex; align-items: center;
          justify-content: center; gap: 5px;
          cursor: pointer; color: #3a6048;
          font-family: 'Inter', sans-serif; font-size: 12px; font-weight: 500;
          transition: background 0.12s; white-space: nowrap;
        }
        .con4-input-btn:hover { background: #ddf0e0; }

        .con4-toggle-row { display: flex; align-items: center; gap: 10px; padding-top: 2px; }
        .con4-toggle { position: relative; width: 38px; height: 20px; flex-shrink: 0; cursor: pointer; }
        .con4-toggle input { opacity: 0; width: 0; height: 0; position: absolute; }
        .con4-toggle-track { position: absolute; inset: 0; background: #d4e0d0; border-radius: 20px; transition: background 0.2s; }
        .con4-toggle input:checked ~ .con4-toggle-track { background: #3e9654; }
        .con4-toggle-thumb {
          position: absolute; top: 3px; left: 3px; width: 14px; height: 14px;
          background: #fff; border-radius: 50%; transition: transform 0.2s;
          box-shadow: 0 1px 3px rgba(0,0,0,0.15);
        }
        .con4-toggle input:checked ~ .con4-toggle-thumb { transform: translateX(18px); }
        .con4-toggle-label { font-size: 12.5px; color: #3a5a45; font-weight: 500; }

        .con4-rw { border-top: 1px solid #edf5e8; overflow-x: auto; }
        .con4-rb {
          display: flex; align-items: center; justify-content: space-between;
          padding: 10px 18px; background: #f4f9f2; border-bottom: 1px solid #e8f0e4;
        }
        .con4-rbl { display: flex; align-items: center; gap: 8px; }
        .con4-rbl-l { font-size: 11px; font-weight: 600; color: #4a7060; text-transform: uppercase; letter-spacing: 0.5px; }
        .con4-rt { width: 100%; border-collapse: collapse; font-size: 13px; }
        .con4-rt th {
          background: #f4f9f2; padding: 8px 12px; text-align: left;
          font-size: 10.5px; font-weight: 700; color: #5a8068;
          text-transform: uppercase; letter-spacing: 0.5px;
          border-bottom: 1.5px solid #dbe8d5; white-space: nowrap;
        }
        .con4-rt td { padding: 9px 12px; border-bottom: 1px solid #f0f6ec; color: #243830; vertical-align: middle; }
        .con4-rem { text-align: center; padding: 28px 12px; color: #96b8a0; font-size: 12.5px; }

        .con4-toggle-group {
          display: flex; align-items: center; gap: 28px; padding: 4px 0;
        }

        .con4-feedback {
          display: flex; align-items: center; gap: 9px; padding: 11px 15px;
          border-radius: 9px; font-size: 13px; animation: con4FadeIn 0.2s ease;
          margin-bottom: 14px;
        }
        .con4-feedback.success { background: #f0faf2; border: 1px solid #b4dec0; color: #1e6030; }
        .con4-feedback.error   { background: #fff5f5; border: 1px solid #f8c0c0; border-left: 3px solid #e05252; color: #b91c1c; }
        .con4-feedback.info    { background: #f0f8ff; border: 1px solid #c7def8; border-left: 3px solid #4a90d9; color: #1a4070; }

        .con4-footer {
          background: #fff; border-top: 1px solid #dbe8d5;
          padding: 8px 20px; display: flex; align-items: center;
          justify-content: space-between; flex-shrink: 0;
        }
        .con4-footer-left { display: flex; align-items: center; gap: 20px; }
        .con4-footer-stat { display: flex; align-items: center; gap: 6px; font-size: 11.5px; color: #6a8a74; }
        .con4-footer-stat strong { color: #1a2e22; font-weight: 600; }

        .con4-badge-status {
          display: inline-flex; align-items: center;
          font-size: 11px; font-weight: 600; border-radius: 12px; padding: 2px 8px;
        }
        .con4-badge-status.green { background: #e8f5e0; color: #2a6018; border: 1px solid #b4d898; }
        .con4-badge-status.red   { background: #fde8e8; color: #8b2020; border: 1px solid #e8a8a8; }
        .con4-badge-status.yellow { background: #fdf8e8; color: #604800; border: 1px solid #e0d090; }

        .con4-tipo-badge {
          display: inline-flex; align-items: center;
          font-size: 11px; font-weight: 600; border-radius: 12px; padding: 2px 8px;
        }
        .con4-tipo-cancelar    { background: #fde8e8; color: #8b2020; border: 1px solid #e8a8a8; }
        .con4-tipo-descancelar { background: #e8f5e0; color: #2a6018; border: 1px solid #b4d898; }

        .con4-historico-list { list-style: none; padding: 0; margin: 0; font-size: 11.5px; }
        .con4-historico-list li { padding: 2px 0; border-bottom: 1px solid #f0f6ec; }
        .con4-historico-list li:last-child { border-bottom: none; }

        @keyframes con4Spin { to { transform: rotate(360deg); } }
        .con4-spinner {
          width: 14px; height: 14px; flex-shrink: 0;
          border: 2px solid rgba(223,240,226,0.3); border-top-color: #dff0e2;
          border-radius: 50%; animation: con4Spin 0.65s linear infinite;
        }
        .con4-spinner-dark {
          width: 14px; height: 14px; flex-shrink: 0;
          border: 2px solid #d4e8cc; border-top-color: #3e9654;
          border-radius: 50%; animation: con4Spin 0.65s linear infinite;
        }
        @keyframes con4FadeIn { from { opacity: 0; transform: translateY(-4px); } to { opacity: 1; transform: translateY(0); } }
      `}</style>

      <div className="con4-root">
        {/* ── TOPBAR ── */}
        <header className="con4-topbar">
          <div className="con4-topbar-left">
            <div className="con4-logo-mark">
              <svg width="15" height="15" viewBox="0 0 18 18" fill="none">
                <rect x="1.5" y="1.5" width="6" height="6" rx="1.2" fill="rgba(255,255,255,0.9)" />
                <rect x="10.5" y="1.5" width="6" height="6" rx="1.2" fill="rgba(255,255,255,0.4)" />
                <rect x="1.5" y="10.5" width="6" height="6" rx="1.2" fill="rgba(255,255,255,0.4)" />
                <rect x="10.5" y="10.5" width="6" height="6" rx="1.2" fill="rgba(255,255,255,0.7)" />
              </svg>
            </div>
            <span className="con4-app-name">
              Venture<span className="con4-app-sub">ERP &amp; Soluções</span>
            </span>
            <span className="con4-screen-title">VCON0202 — Cancelamento de Itens do Contrato</span>
          </div>
        </header>

        {/* ── ACTION BAR ── */}
        <div className="con4-actionbar">
          <div className="con4-action-group">
            <span className="con4-action-label">Ações</span>
            <button className="con4-btn con4-btn-primary" onClick={() => void handleSalvar()} disabled={isSaving || isLoading}>
              {isSaving
                ? <><div className="con4-spinner" />Salvando...</>
                : <>
                    <svg width="13" height="13" viewBox="0 0 16 16" fill="none">
                      <path d="M2 2h9l3 3v9a1 1 0 01-1 1H3a1 1 0 01-1-1V3a1 1 0 011-1z" stroke="currentColor" strokeWidth="1.4" strokeLinejoin="round" />
                      <path d="M5 2v4h6V2M5 9h6" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" />
                    </svg>
                    Salvar
                  </>
              }
            </button>
            <button className="con4-btn con4-btn-danger" onClick={handleLimpar} disabled={isSaving || isLoading}>
              <svg width="13" height="13" viewBox="0 0 16 16" fill="none">
                <path d="M3 3l10 10M13 3L3 13" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
              </svg>
              Limpar
            </button>
          </div>
        </div>

        {/* ── BODY ── */}
        <div className="con4-body">
          {feedback && (
            <div className={`con4-feedback ${feedback.type}`}>
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

          <div className="con4-section-banner">
            <span className="con4-section-banner-pill">1 — Contrato</span>
            <div className="con4-section-banner-line" />
            <span className="con4-section-banner-hint">Informe o contrato e clique em Carregar</span>
          </div>

          <div className="con4-card">
            <div className="con4-card-header">
              <div className="con4-card-header-left">
                <svg width="14" height="14" viewBox="0 0 16 16" fill="none">
                  <path d="M2 2h9l3 3v9a1 1 0 01-1 1H3a1 1 0 01-1-1V3a1 1 0 011-1z" stroke="#3e9654" strokeWidth="1.4" strokeLinejoin="round" />
                  <path d="M5 2v4h6V2M5 9h6" stroke="#3e9654" strokeWidth="1.4" strokeLinecap="round" />
                </svg>
                <span className="con4-card-title">Seleção de Contrato</span>
              </div>
            </div>
            <div className="con4-card-body" style={{ paddingBottom: 14 }}>
              <div className="con4-filter-row">
                <div className="con4-field" style={{ flex: "0 0 220px" }}>
                  <label className="con4-label">Contrato</label>
                  <div className="con4-input-wrap">
                    <input
                      className="con4-input"
                      style={{ borderRadius: "7px 0 0 7px" }}
                      placeholder="Código do contrato"
                      value={form.contrato}
                      onChange={(e) => setField("contrato", e.target.value)}
                      onKeyDown={(e) => e.key === "Enter" && void handleCarregar()}
                    />
                    <button className="con4-input-btn" onClick={() => void handleCarregar()} disabled={isLoading}>
                      {isLoading
                        ? <div className="con4-spinner-dark" style={{ width: 12, height: 12 }} />
                        : "Carregar"
                      }
                    </button>
                  </div>
                </div>
              </div>
            </div>
          </div>

          {itens.length > 0 && (
            <>
              <div className="con4-section-banner">
                <span className="con4-section-banner-pill">2 — Cancelamento</span>
                <div className="con4-section-banner-line" />
                <span className="con4-section-banner-hint">{itens.length} item(ns) carregado(s)</span>
              </div>

              <div className="con4-card">
                <div className="con4-card-body" style={{ paddingBottom: 10 }}>
                  <div className="con4-toggle-group">
                    <div className="con4-toggle-row">
                      <label className="con4-toggle">
                        <input type="checkbox" checked={form.cancela_todos} onChange={(e) => { setField("cancela_todos", e.target.checked); if (e.target.checked) applyCancelaTodos(); }} />
                        <div className="con4-toggle-track" />
                        <div className="con4-toggle-thumb" />
                      </label>
                      <span className="con4-toggle-label">Cancela Todos</span>
                    </div>
                    <div className="con4-toggle-row">
                      <label className="con4-toggle">
                        <input type="checkbox" checked={form.descancela_todos} onChange={(e) => { setField("descancela_todos", e.target.checked); if (e.target.checked) applyDescancelaTodos(); }} />
                        <div className="con4-toggle-track" />
                        <div className="con4-toggle-thumb" />
                      </label>
                      <span className="con4-toggle-label">Descancela Todos</span>
                    </div>
                  </div>
                </div>

                <div className="con4-rw">
                  <table className="con4-rt">
                    <thead>
                      <tr>
                        <th style={{ width: 70 }}>Código</th>
                        <th>Descrição</th>
                        <th style={{ width: 120 }}>Tipo</th>
                        <th style={{ width: 180 }}>Motivo</th>
                        <th style={{ width: 90 }}>Solicitada</th>
                        <th style={{ width: 100 }}>Atendimento</th>
                        <th style={{ width: 110 }}>Recebimento</th>
                        <th style={{ width: 280 }}>Histórico</th>
                      </tr>
                    </thead>
                    <tbody>
                      {itens.map((it) => (
                        <tr key={it.codigo}>
                          <td style={{ fontWeight: 600, color: "#1a4a2a" }}>{it.codigo}</td>
                          <td>{it.descricao}</td>
                          <td>
                            <select
                              className="con4-select"
                              value={it.tipo}
                              onChange={(e) => updateItem(it.codigo, "tipo", e.target.value)}
                              style={{ height: 30, fontSize: 12, padding: "0 24px 0 8px" }}
                            >
                              <option value="Cancelar">Cancelar</option>
                              <option value="Descancelar">Descancelar</option>
                            </select>
                          </td>
                          <td>
                            <select
                              className="con4-select"
                              value={it.motivo}
                              onChange={(e) => updateItem(it.codigo, "motivo", e.target.value)}
                              style={{ height: 30, fontSize: 12, padding: "0 24px 0 8px" }}
                            >
                              <option value="">Selecione...</option>
                              {MOTIVOS.map((m) => <option key={m} value={m}>{m}</option>)}
                            </select>
                          </td>
                          <td>{it.solicitada}</td>
                          <td>
                            <span className={`con4-badge-status ${it.atendimento === "Atendida" ? "green" : it.atendimento === "Cancelada" ? "red" : "yellow"}`}>
                              {it.atendimento}
                            </span>
                          </td>
                          <td>
                            <span className={`con4-badge-status ${it.recebimento === "Atendida" ? "green" : it.recebimento === "Cancelada" ? "red" : "yellow"}`}>
                              {it.recebimento}
                            </span>
                          </td>
                          <td style={{ fontSize: 11.5 }}>
                            {it.historico.length > 0 ? (
                              <ul className="con4-historico-list">
                                {it.historico.map((h, i) => (
                                  <li key={i}>{formatDateBR(h.data)} — Qtd: {h.qtde} — {h.tipo} — {h.usuario} — {h.motivo}</li>
                                ))}
                              </ul>
                            ) : "—"}
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

        {/* ── FOOTER ── */}
        <footer className="con4-footer">
          <div className="con4-footer-left">
            <div className="con4-footer-stat">Itens: <strong>{itens.length}</strong></div>
            <div className="con4-footer-stat">Módulo: <strong>Suprimento</strong></div>
          </div>
          <div className="con4-footer-stat" style={{ gap: 8 }}>
            <span style={{ color: "#b0c8b8", fontSize: 11 }}>GRUPO VENTURE LTDA</span>
          </div>
        </footer>
      </div>
    </>
  );
}
