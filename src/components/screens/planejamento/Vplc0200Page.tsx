import React, { useState } from "react";
import {
  type MontagemCargaResponse,
  type PedidoCargaResponse,
} from "@/services/montagemCargaService";

// ─── Constants ────────────────────────────────────────────────────────────────

const TIPOS_FRETE = [
  "Cif-Contrat.",
  "Daf",
  "Cif-Próprio",
  "Fob-Contrat.",
  "Fob-Próprio",
  "Sem Frete",
  "Convênio",
  "Retira",
  "Cortesia",
  "Terceiros",
];

// ─── Types ────────────────────────────────────────────────────────────────────

type FeedbackState = { type: "success" | "error" | "info"; message: string } | null;

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

export function Vplc0200Page(): JSX.Element {
  const [tpFrete, setTpFrete] = useState("");
  const [cargas, setCargas] = useState<MontagemCargaResponse[]>([]);
  const [executou, setExecutou] = useState(false);

  const [isExecutando, setIsExecutando] = useState(false);
  const [feedback, setFeedback] = useState<FeedbackState>(null);

  const [modalPedidos, setModalPedidos] = useState<PedidoCargaResponse[] | null>(null);
  const [modalCargaTitulo, setModalCargaTitulo] = useState("");
  const [modalInfoPedido, setModalInfoPedido] = useState<PedidoCargaResponse | null>(null);

  async function handleExecutar() {
    if (!tpFrete) {
      setFeedback({ type: "error", message: "Selecione um tipo de frete." });
      return;
    }
    setIsExecutando(true);
    setFeedback(null);
    try {
      await new Promise((r) => setTimeout(r, 1200));
      const mockCargas: MontagemCargaResponse[] = [
        {
          carga: "C-001",
          tp_frete: tpFrete,
          total_pedidos: 3,
          total_valor: 25400.00,
          total_peso: 1250.5,
          pedidos: [
            { pedido: "000150", cliente: "001", cliente_nome: "SOHOME LTDA", valor: 4850.00, peso: 320.0, volumes: 5 },
            { pedido: "000151", cliente: "001", cliente_nome: "SOHOME LTDA", valor: 12300.50, peso: 580.0, volumes: 8 },
            { pedido: "000152", cliente: "002", cliente_nome: "ALFA S.A.", valor: 8249.50, peso: 350.5, volumes: 4 },
          ],
        },
        {
          carga: "C-002",
          tp_frete: tpFrete,
          total_pedidos: 2,
          total_valor: 11200.00,
          total_peso: 780.0,
          pedidos: [
            { pedido: "000153", cliente: "003", cliente_nome: "BETA LTDA", valor: 5600.00, peso: 400.0, volumes: 6 },
            { pedido: "000154", cliente: "004", cliente_nome: "GAMA ME", valor: 5600.00, peso: 380.0, volumes: 5 },
          ],
        },
      ];
      setCargas(mockCargas);
      setExecutou(true);
      setFeedback({ type: "success", message: `${mockCargas.length} carga(s) montada(s) com ${mockCargas.reduce((s, c) => s + c.total_pedidos, 0)} pedido(s).` });
    } catch (error) {
      setFeedback({ type: "error", message: normalizeErrorMessage(error, "Erro ao executar montagem de carga.") });
    } finally {
      setIsExecutando(false);
    }
  }

  function handleFrete() {
    setFeedback({ type: "info", message: "Função de cálculo de frete será implementada." });
  }

  function handleLote() {
    setFeedback({ type: "info", message: "Função de geração de lote será implementada." });
  }

  function handleAddPedidos() {
    setFeedback({ type: "info", message: "Função para adicionar pedidos manualmente será implementada." });
  }

  function handleLimpar() {
    setTpFrete("");
    setCargas([]);
    setExecutou(false);
    setFeedback(null);
    setModalPedidos(null);
    setModalInfoPedido(null);
  }

  function openPedidosModal(carga: MontagemCargaResponse) {
    setModalPedidos(carga.pedidos);
    setModalCargaTitulo(carga.carga);
  }

  function openInfoPedidoModal(pedido: PedidoCargaResponse) {
    setModalInfoPedido(pedido);
  }

  const totalPedidos = cargas.reduce((s, c) => s + c.total_pedidos, 0);
  const totalValor = cargas.reduce((s, c) => s + c.total_valor, 0);
  const totalPeso = cargas.reduce((s, c) => s + c.total_peso, 0);

  return (
    <>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Inter:wght@300;400;500;600&display=swap');
        *, *::before, *::after { box-sizing: border-box; margin: 0; padding: 0; }

        .plc2-root {
          min-height: 100vh; background: #f0f4ee;
          font-family: 'Inter', sans-serif; color: #1a2e22;
          display: flex; flex-direction: column;
        }

        .plc2-topbar {
          height: 52px; background: #162e20;
          display: flex; align-items: center; justify-content: space-between;
          padding: 0 20px; flex-shrink: 0;
          border-bottom: 1px solid rgba(62,150,84,0.15);
        }
        .plc2-topbar-left { display: flex; align-items: center; gap: 10px; }
        .plc2-logo-mark {
          width: 28px; height: 28px; background: #3e9654;
          border-radius: 6px; display: flex; align-items: center; justify-content: center;
        }
        .plc2-app-name { font-size: 13px; font-weight: 600; color: #e0f0e3; line-height: 1.1; }
        .plc2-app-sub  { display: block; font-size: 9px; font-weight: 400; color: #3d6b4d; }
        .plc2-screen-title {
          font-size: 12.5px; font-weight: 500; color: #5a9a6a;
          padding-left: 14px; margin-left: 14px;
          border-left: 1px solid rgba(255,255,255,0.08);
        }

        .plc2-actionbar {
          background: #fff; border-bottom: 1px solid #dbe8d5;
          padding: 0 20px; display: flex; align-items: center;
          gap: 4px; height: 46px; flex-shrink: 0;
        }
        .plc2-action-group {
          display: flex; align-items: center; gap: 4px;
          padding-right: 12px; margin-right: 8px;
          border-right: 1px solid #e8f0e4;
        }
        .plc2-action-group:last-child { border-right: none; }
        .plc2-action-label {
          font-size: 9.5px; font-weight: 600; letter-spacing: 0.8px;
          text-transform: uppercase; color: #96b8a0; margin-right: 4px; white-space: nowrap;
        }
        .plc2-btn {
          display: inline-flex; align-items: center; gap: 6px;
          height: 32px; padding: 0 12px; border: 1.5px solid transparent;
          border-radius: 7px; font-family: 'Inter', sans-serif;
          font-size: 12.5px; font-weight: 500; cursor: pointer; white-space: nowrap;
          transition: background 0.13s, border-color 0.13s, color 0.13s;
        }
        .plc2-btn-primary { background: #162e20; color: #dff0e2; border-color: #162e20; }
        .plc2-btn-primary:hover:not(:disabled) { background: #1e3a2a; }
        .plc2-btn-primary:disabled { opacity: 0.5; cursor: not-allowed; }
        .plc2-btn-ghost { background: transparent; color: #4a7060; border-color: #d4e8d0; }
        .plc2-btn-ghost:hover:not(:disabled) { background: #f0f8ec; border-color: #b0d4b8; color: #1a3828; }
        .plc2-btn-ghost:disabled { opacity: 0.5; cursor: not-allowed; }
        .plc2-btn-danger { background: transparent; color: #b94040; border-color: #f0c8c8; }
        .plc2-btn-danger:hover:not(:disabled) { background: #fff0f0; border-color: #e09090; }
        .plc2-btn-sm { height: 28px; padding: 0 9px; font-size: 12px; }
        .plc2-btn-exec {
          background: #1a4a2a; color: #dff0e2; border-color: #1a4a2a; font-weight: 600;
        }
        .plc2-btn-exec:hover:not(:disabled) { background: #225a32; }

        .plc2-body {
          flex: 1; padding: 16px 20px; display: flex;
          flex-direction: column; gap: 0; overflow-y: auto;
        }
        .plc2-body::-webkit-scrollbar { width: 5px; }
        .plc2-body::-webkit-scrollbar-thumb { background: #cce0c8; border-radius: 4px; }

        .plc2-section-banner {
          display: flex; align-items: center; gap: 10px;
          padding: 14px 0 8px;
        }
        .plc2-section-banner:first-child { padding-top: 0; }
        .plc2-section-banner-pill {
          font-size: 9.5px; font-weight: 700; letter-spacing: 1.2px;
          text-transform: uppercase; color: #5a8068;
          background: #e0ede0; border: 1px solid #c8dcc8;
          border-radius: 20px; padding: 3px 10px; white-space: nowrap;
        }
        .plc2-section-banner-line { flex: 1; height: 1px; background: #dbe8d5; }
        .plc2-section-banner-hint { font-size: 11px; color: #96b8a0; white-space: nowrap; }

        .plc2-card {
          background: #fff; border: 1px solid #dbe8d5;
          border-radius: 12px; overflow: hidden; margin-bottom: 14px;
        }
        .plc2-card-header {
          display: flex; align-items: center; justify-content: space-between;
          padding: 12px 18px; border-bottom: 1px solid #edf5e8; background: #fafcf9;
        }
        .plc2-card-header-left { display: flex; align-items: center; gap: 8px; }
        .plc2-card-title { font-size: 12px; font-weight: 600; color: #2a4a35; text-transform: uppercase; letter-spacing: 0.6px; }
        .plc2-card-badge {
          font-size: 10.5px; font-weight: 500; color: #3e9654;
          background: #eef5ea; border: 1px solid #c4dfc8; border-radius: 12px; padding: 2px 8px;
        }
        .plc2-card-body { padding: 18px 18px; }

        .plc2-filter-row { display: flex; align-items: flex-end; gap: 12px; flex-wrap: wrap; }

        .plc2-field { display: flex; flex-direction: column; gap: 5px; }
        .plc2-label {
          font-size: 10.5px; font-weight: 600; color: #5a8068;
          text-transform: uppercase; letter-spacing: 0.4px;
          display: flex; align-items: center; gap: 4px;
        }
        .plc2-label-req { color: #c84040; font-size: 12px; line-height: 1; }
        .plc2-select {
          width: 100%; height: 36px; background: #f8fbf6;
          border: 1.5px solid #d4e8cc; border-radius: 7px;
          padding: 0 28px 0 10px; font-family: 'Inter', sans-serif;
          font-size: 13px; color: #1a2e22; outline: none;
          appearance: none; cursor: pointer;
          background-image: url("data:image/svg+xml,%3Csvg width='10' height='6' viewBox='0 0 10 6' xmlns='http://www.w3.org/2000/svg'%3E%3Cpath d='M1 1l4 4 4-4' stroke='%23789a84' stroke-width='1.5' fill='none' stroke-linecap='round' stroke-linejoin='round'/%3E%3C/svg%3E");
          background-repeat: no-repeat; background-position: right 10px center;
          transition: border-color 0.13s;
        }
        .plc2-select:focus { border-color: #3e9654; box-shadow: 0 0 0 2px rgba(62,150,84,0.1); }

        .plc2-field-hint { font-size: 11px; color: #7a9c84; margin-top: 2px; line-height: 1.45; }

        .plc2-feedback {
          display: flex; align-items: center; gap: 9px; padding: 11px 15px;
          border-radius: 9px; font-size: 13px; animation: plc2FadeIn 0.2s ease;
          margin-bottom: 14px;
        }
        .plc2-feedback.success { background: #f0faf2; border: 1px solid #b4dec0; color: #1e6030; }
        .plc2-feedback.error   { background: #fff5f5; border: 1px solid #f8c0c0; border-left: 3px solid #e05252; color: #b91c1c; }
        .plc2-feedback.info    { background: #f0f8ff; border: 1px solid #c7def8; border-left: 3px solid #4a90d9; color: #1a4070; }

        .plc2-results-wrap { border-top: 1px solid #edf5e8; overflow-x: auto; }
        .plc2-results-bar {
          display: flex; align-items: center; justify-content: space-between;
          padding: 10px 18px; background: #f4f9f2; border-bottom: 1px solid #e8f0e4;
        }
        .plc2-results-bar-left { display: flex; align-items: center; gap: 8px; }
        .plc2-results-bar-label { font-size: 11px; font-weight: 600; color: #4a7060; text-transform: uppercase; letter-spacing: 0.5px; }
        .plc2-results-hint { font-size: 11px; color: #96b8a0; }
        .plc2-results-table { width: 100%; border-collapse: collapse; font-size: 13px; }
        .plc2-results-table th {
          background: #f4f9f2; padding: 8px 12px; text-align: left;
          font-size: 10.5px; font-weight: 700; color: #5a8068;
          text-transform: uppercase; letter-spacing: 0.5px;
          border-bottom: 1.5px solid #dbe8d5; white-space: nowrap;
        }
        .plc2-results-table td { padding: 9px 12px; border-bottom: 1px solid #f0f6ec; color: #243830; vertical-align: middle; }
        .plc2-results-table tbody tr { transition: background 0.1s; }
        .plc2-results-table tbody tr:hover { background: #eef9f0; }
        .plc2-results-empty { text-align: center; padding: 28px 12px; color: #96b8a0; font-size: 12.5px; }
        .plc2-carga-sep td {
          background: #f4f9f2; font-weight: 700; color: #1a2e22;
          border-top: 2px solid #dbe8d5; padding: 10px 12px; font-size: 12px;
        }

        .plc2-link-btn {
          background: transparent; border: none; cursor: pointer;
          color: #3e9654; font-size: 12px; font-weight: 500; font-family: 'Inter', sans-serif;
          text-decoration: underline; padding: 0;
        }
        .plc2-link-btn:hover { color: #2a6a3a; }

        .plc2-modal-overlay {
          position: fixed; inset: 0; background: rgba(10,18,12,0.6);
          display: flex; align-items: center; justify-content: center;
          z-index: 1000; animation: plc2FadeIn 0.15s ease;
        }
        .plc2-modal {
          background: #fff; border-radius: 12px; max-width: 700px; width: 90%;
          max-height: 80vh; overflow-y: auto; border: 1px solid #dbe8d5;
        }
        .plc2-modal-header {
          display: flex; align-items: center; justify-content: space-between;
          padding: 14px 18px; border-bottom: 1px solid #edf5e8; background: #fafcf9;
        }
        .plc2-modal-title { font-size: 13px; font-weight: 600; color: #2a4a35; text-transform: uppercase; letter-spacing: 0.6px; }
        .plc2-modal-close {
          background: transparent; border: none; cursor: pointer; color: #8aaa94;
          padding: 4px; border-radius: 6px; transition: background 0.12s, color 0.12s;
        }
        .plc2-modal-close:hover { background: #f0f4ee; color: #4a7060; }
        .plc2-modal-body { padding: 18px; }

        .plc2-info-table { width: 100%; border-collapse: collapse; font-size: 13px; }
        .plc2-info-table th {
          background: #f4f9f2; padding: 8px 12px; text-align: left;
          font-size: 10.5px; font-weight: 700; color: #5a8068;
          text-transform: uppercase; letter-spacing: 0.5px;
          border-bottom: 1.5px solid #dbe8d5;
        }
        .plc2-info-table td { padding: 9px 12px; border-bottom: 1px solid #f0f6ec; color: #243830; }

        .plc2-info-grid { display: grid; grid-template-columns: 1fr 1fr; gap: 12px 24px; }
        .plc2-info-item { display: flex; flex-direction: column; gap: 4px; }
        .plc2-info-label {
          font-size: 10px; font-weight: 600; color: #8aaa94;
          text-transform: uppercase; letter-spacing: 0.5px;
        }
        .plc2-info-value { font-size: 14px; font-weight: 500; color: #1a2e22; }

        .plc2-section-sep { height: 1px; background: #edf5e8; margin: 16px 0; }

        .plc2-footer {
          background: #fff; border-top: 1px solid #dbe8d5;
          padding: 8px 20px; display: flex; align-items: center;
          justify-content: space-between; flex-shrink: 0;
        }
        .plc2-footer-left { display: flex; align-items: center; gap: 20px; }
        .plc2-footer-stat { display: flex; align-items: center; gap: 6px; font-size: 11.5px; color: #6a8a74; }
        .plc2-footer-stat strong { color: #1a2e22; font-weight: 600; }

        @keyframes spin { to { transform: rotate(360deg); } }
        .plc2-spinner {
          width: 14px; height: 14px; flex-shrink: 0;
          border: 2px solid rgba(223,240,226,0.3); border-top-color: #dff0e2;
          border-radius: 50%; animation: spin 0.65s linear infinite;
        }
        .plc2-spinner-dark {
          width: 14px; height: 14px; flex-shrink: 0;
          border: 2px solid #d4e8cc; border-top-color: #3e9654;
          border-radius: 50%; animation: spin 0.65s linear infinite;
        }
        @keyframes plc2FadeIn { from { opacity: 0; transform: translateY(-4px); } to { opacity: 1; transform: translateY(0); } }
      `}</style>

      <div className="plc2-root">

        <header className="plc2-topbar">
          <div className="plc2-topbar-left">
            <div className="plc2-logo-mark">
              <svg width="15" height="15" viewBox="0 0 18 18" fill="none">
                <rect x="1.5" y="1.5" width="6" height="6" rx="1.2" fill="rgba(255,255,255,0.9)" />
                <rect x="10.5" y="1.5" width="6" height="6" rx="1.2" fill="rgba(255,255,255,0.4)" />
                <rect x="1.5" y="10.5" width="6" height="6" rx="1.2" fill="rgba(255,255,255,0.4)" />
                <rect x="10.5" y="10.5" width="6" height="6" rx="1.2" fill="rgba(255,255,255,0.7)" />
              </svg>
            </div>
            <span className="plc2-app-name">
              Venture<span className="plc2-app-sub">ERP &amp; Soluções</span>
            </span>
            <span className="plc2-screen-title">VPLC0200 — Montagem de Carga</span>
          </div>
        </header>

        <div className="plc2-actionbar">
          <div className="plc2-action-group">
            <span className="plc2-action-label">Operação</span>
            <button className="plc2-btn plc2-btn-exec" onClick={() => void handleExecutar()} disabled={isExecutando}>
              {isExecutando
                ? <><div className="plc2-spinner" />Executando...</>
                : <>
                    <svg width="13" height="13" viewBox="0 0 16 16" fill="none">
                      <path d="M3 2l10 6-10 6V2z" fill="currentColor" />
                    </svg>
                    Executar
                  </>
              }
            </button>
            <button className="plc2-btn plc2-btn-ghost" onClick={handleFrete} disabled={!executou || isExecutando}>
              <svg width="13" height="13" viewBox="0 0 16 16" fill="none">
                <path d="M1 4h10l3 4v3a1 1 0 01-1 1h-1a2 2 0 01-4 0H6a2 2 0 01-4 0H1V4z" stroke="currentColor" strokeWidth="1.4" strokeLinejoin="round" />
                <circle cx="5.5" cy="13" r="1.5" stroke="currentColor" strokeWidth="1.4" />
                <circle cx="11.5" cy="13" r="1.5" stroke="currentColor" strokeWidth="1.4" />
              </svg>
              Frete
            </button>
            <button className="plc2-btn plc2-btn-ghost" onClick={handleLote} disabled={!executou || isExecutando}>
              <svg width="13" height="13" viewBox="0 0 16 16" fill="none">
                <path d="M4 2h8v4H4V2zM2 6h12v8H2V6z" stroke="currentColor" strokeWidth="1.4" strokeLinejoin="round" />
              </svg>
              Lote
            </button>
            <button className="plc2-btn plc2-btn-ghost" onClick={handleAddPedidos} disabled={isExecutando}>
              <svg width="12" height="12" viewBox="0 0 12 12" fill="none">
                <path d="M6 2v8M2 6h8" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" />
              </svg>
              + Pedidos
            </button>
          </div>
          <div className="plc2-action-group">
            <span className="plc2-action-label">Ações</span>
            <button className="plc2-btn plc2-btn-danger" onClick={handleLimpar} disabled={isExecutando}>
              <svg width="13" height="13" viewBox="0 0 16 16" fill="none">
                <path d="M3 3l10 10M13 3L3 13" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
              </svg>
              Limpar
            </button>
          </div>
          <div className="plc2-action-group">
            <button className="plc2-btn plc2-btn-ghost">
              <svg width="13" height="13" viewBox="0 0 16 16" fill="none">
                <circle cx="8" cy="8" r="6" stroke="currentColor" strokeWidth="1.4" />
                <path d="M8 7v4M8 5.5h.01" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" />
              </svg>
              Ajuda
            </button>
          </div>
        </div>

        <div className="plc2-body">

          {feedback && (
            <div className={`plc2-feedback ${feedback.type}`}>
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

          <div className="plc2-section-banner">
            <span className="plc2-section-banner-pill">1 — Filtros</span>
            <div className="plc2-section-banner-line" />
            <span className="plc2-section-banner-hint">Selecione o tipo de frete e execute a montagem</span>
          </div>

          <div className="plc2-card">
            <div className="plc2-card-header">
              <div className="plc2-card-header-left">
                <svg width="14" height="14" viewBox="0 0 16 16" fill="none">
                  <circle cx="6.5" cy="6.5" r="4.5" stroke="#3e9654" strokeWidth="1.4" />
                  <path d="M10 10l3.5 3.5" stroke="#3e9654" strokeWidth="1.4" strokeLinecap="round" />
                </svg>
                <span className="plc2-card-title">Parâmetros de Montagem</span>
              </div>
            </div>
            <div className="plc2-card-body">
              <div className="plc2-filter-row">
                <div className="plc2-field" style={{ flex: "0 0 280px" }}>
                  <label className="plc2-label">Tipo de Frete <span className="plc2-label-req">*</span></label>
                  <select className="plc2-select" value={tpFrete} onChange={(e) => setTpFrete(e.target.value)}>
                    <option value="">Selecione...</option>
                    {TIPOS_FRETE.map((t) => <option key={t} value={t}>{t}</option>)}
                  </select>
                  <span className="plc2-field-hint">Define a modalidade de frete para montagem das cargas.</span>
                </div>
              </div>
            </div>
          </div>

          {executou && cargas.length > 0 && (
            <>
              <div className="plc2-section-banner">
                <span className="plc2-section-banner-pill">2 — Cargas Montadas</span>
                <div className="plc2-section-banner-line" />
                <span className="plc2-section-banner-hint">{cargas.length} carga(s) — {totalPedidos} pedido(s) — R$ {totalValor.toFixed(2)}</span>
              </div>

              <div className="plc2-card">
                <div className="plc2-results-wrap">
                  <div className="plc2-results-bar">
                    <div className="plc2-results-bar-left">
                      <svg width="13" height="13" viewBox="0 0 16 16" fill="none">
                        <path d="M2 4h12M2 8h12M2 12h8" stroke="#5a8068" strokeWidth="1.4" strokeLinecap="round" />
                      </svg>
                      <span className="plc2-results-bar-label">Pedidos por Carga</span>
                      <span className="plc2-card-badge">{totalPedidos} pedido(s)</span>
                    </div>
                    <span className="plc2-results-hint">TP. Frete: {tpFrete}</span>
                  </div>

                  <table className="plc2-results-table">
                    <thead>
                      <tr>
                        <th style={{ width: 80 }}>Carga</th>
                        <th style={{ width: 100 }}>Pedido</th>
                        <th>Cliente</th>
                        <th style={{ width: 130 }}>Valor (R$)</th>
                        <th style={{ width: 100 }}>Peso (kg)</th>
                        <th style={{ width: 80 }}>Volumes</th>
                        <th style={{ width: 100 }}>Ações</th>
                      </tr>
                    </thead>
                    <tbody>
                      {cargas.map((carga) => (
                        <React.Fragment key={carga.carga}>
                          <tr className="plc2-carga-sep">
                            <td colSpan={7}>
                              Carga {carga.carga} — {carga.total_pedidos} pedido(s) — Total: R$ {carga.total_valor.toFixed(2)} — Peso: {carga.total_peso.toFixed(1)} kg
                              {" "}
                              <button className="plc2-link-btn" onClick={() => openPedidosModal(carga)} style={{ marginLeft: 12 }}>Ver Pedidos</button>
                            </td>
                          </tr>
                          {carga.pedidos.map((p) => (
                            <tr key={p.pedido}>
                              <td></td>
                              <td style={{ fontWeight: 600, color: "#1a4a2a" }}>#{p.pedido}</td>
                              <td>{p.cliente} – {p.cliente_nome}</td>
                              <td>R$ {p.valor.toFixed(2)}</td>
                              <td>{p.peso.toFixed(1)}</td>
                              <td>{p.volumes}</td>
                              <td>
                                <button className="plc2-link-btn" onClick={() => openInfoPedidoModal(p)}>Info. Pedido</button>
                              </td>
                            </tr>
                          ))}
                        </React.Fragment>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            </>
          )}

          {executou && cargas.length === 0 && (
            <div className="plc2-card">
              <div className="plc2-card-body">
                <div className="plc2-results-empty">Nenhuma carga gerada. Verifique os parâmetros e tente novamente.</div>
              </div>
            </div>
          )}
        </div>

        <footer className="plc2-footer">
          <div className="plc2-footer-left">
            <div className="plc2-footer-stat">Cargas: <strong>{cargas.length}</strong></div>
            <div className="plc2-footer-stat">Pedidos: <strong>{totalPedidos}</strong></div>
            <div className="plc2-footer-stat">Valor Total: <strong>R$ {totalValor.toFixed(2)}</strong></div>
            <div className="plc2-footer-stat">Peso Total: <strong>{totalPeso.toFixed(1)} kg</strong></div>
            <div className="plc2-footer-stat">Módulo: <strong>Planejamento</strong></div>
          </div>
          <div className="plc2-footer-stat" style={{ gap: 8 }}>
            <span style={{ color: "#b0c8b8", fontSize: 11 }}>GRUPO VENTURE LTDA</span>
          </div>
        </footer>

        {/* MODAL: Pedidos da Carga */}
        {modalPedidos && (
          <div className="plc2-modal-overlay" onClick={() => setModalPedidos(null)}>
            <div className="plc2-modal" onClick={(e) => e.stopPropagation()}>
              <div className="plc2-modal-header">
                <span className="plc2-modal-title">Pedidos — Carga {modalCargaTitulo}</span>
                <button className="plc2-modal-close" onClick={() => setModalPedidos(null)}>
                  <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
                    <path d="M4 4l8 8M12 4l-8 8" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
                  </svg>
                </button>
              </div>
              <div className="plc2-modal-body">
                <table className="plc2-info-table">
                  <thead>
                    <tr>
                      <th>Pedido</th><th>Cliente</th><th>Valor (R$)</th><th>Peso (kg)</th><th>Volumes</th>
                    </tr>
                  </thead>
                  <tbody>
                    {modalPedidos.map((p) => (
                      <tr key={p.pedido}>
                        <td style={{ fontWeight: 600, color: "#1a4a2a" }}>#{p.pedido}</td>
                        <td>{p.cliente_nome}</td>
                        <td>R$ {p.valor.toFixed(2)}</td>
                        <td>{p.peso.toFixed(1)}</td>
                        <td>{p.volumes}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        )}

        {/* MODAL: Info. Pedido */}
        {modalInfoPedido && (
          <div className="plc2-modal-overlay" onClick={() => setModalInfoPedido(null)}>
            <div className="plc2-modal" onClick={(e) => e.stopPropagation()}>
              <div className="plc2-modal-header">
                <span className="plc2-modal-title">Informações do Pedido #{modalInfoPedido.pedido}</span>
                <button className="plc2-modal-close" onClick={() => setModalInfoPedido(null)}>
                  <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
                    <path d="M4 4l8 8M12 4l-8 8" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
                  </svg>
                </button>
              </div>
              <div className="plc2-modal-body">
                <div className="plc2-info-grid">
                  <div className="plc2-info-item">
                    <span className="plc2-info-label">Pedido</span>
                    <span className="plc2-info-value">#{modalInfoPedido.pedido}</span>
                  </div>
                  <div className="plc2-info-item">
                    <span className="plc2-info-label">Cliente</span>
                    <span className="plc2-info-value">{modalInfoPedido.cliente} – {modalInfoPedido.cliente_nome}</span>
                  </div>
                  <div className="plc2-info-item">
                    <span className="plc2-info-label">Valor</span>
                    <span className="plc2-info-value">R$ {modalInfoPedido.valor.toFixed(2)}</span>
                  </div>
                  <div className="plc2-info-item">
                    <span className="plc2-info-label">Peso</span>
                    <span className="plc2-info-value">{modalInfoPedido.peso.toFixed(1)} kg</span>
                  </div>
                  <div className="plc2-info-item">
                    <span className="plc2-info-label">Volumes</span>
                    <span className="plc2-info-value">{modalInfoPedido.volumes}</span>
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>
    </>
  );
}

