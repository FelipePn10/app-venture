import { useState, useCallback } from "react";
import {
  criarContrato,
  buscarContrato,
  type ContratoDTO,
} from "@/services/contratosService";

// ─── Types ────────────────────────────────────────────────────────────────────

type FeedbackState = { type: "success" | "error" | "info"; message: string } | null;

interface FormContrato {
  contrato: string;
  tp_contrato: string;
  contrato_for: string;
  fornecedor: string;
  abertura: string;
  validade: string;
  encerramento: string;
  moeda: string;
  data_moeda: string;
  data_base_conversao: string;
  valor: string;
  conta_financ: string;
  descricao: string;
  data_vcto: string;
  tipo_pgto: string;
  tipo_vcto: string;
  subsequente: boolean;
}

function today(): string {
  return new Date().toISOString().substring(0, 10);
}

const FORM_INICIAL: FormContrato = {
  contrato: "",
  tp_contrato: "",
  contrato_for: "",
  fornecedor: "",
  abertura: today(),
  validade: "",
  encerramento: "",
  moeda: "",
  data_moeda: "Data Atual",
  data_base_conversao: "",
  valor: "",
  conta_financ: "",
  descricao: "",
  data_vcto: "",
  tipo_pgto: "",
  tipo_vcto: "",
  subsequente: false,
};

// ─── Mock Data ────────────────────────────────────────────────────────────────

const FORNECEDORES = [
  { code: "001", nome: "SOHOME LTDA" },
  { code: "002", nome: "ALFA S.A." },
  { code: "003", nome: "BETA INDÚSTRIA" },
];

const TIPOS_CONTRATO = [
  { codigo: "001", descricao: "Contrato de Compra", tempo_determinado: "Sim" },
  { codigo: "002", descricao: "Contrato de Serviço", tempo_determinado: "Não" },
  { codigo: "003", descricao: "Fornecimento Continuado", tempo_determinado: "Não" },
];

const MOEDAS = ["BRL - Real", "USD - Dólar", "EUR - Euro", "ARS - Peso"];
const DATA_MOEDA_OPTS = ["Data Atual", "Data Abertura", "Informado", "Valor Fixo"];
const CONTAS_FINANC = ["1.1.1 - Caixa Geral", "1.1.2 - Banco A", "2.1.1 - Fornecedores"];
const TIPOS_PGTO = ["À Vista", "Boleto", "Transferência", "Cartão"];
const TIPOS_VCTO = ["30/60/90", "28 ddl", "Semanal", "Mensal"];

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

// ─── Component ────────────────────────────────────────────────────────────────

export function Vcon0200Page(): JSX.Element {
  // ── Form
  const [form, setForm] = useState<FormContrato>(FORM_INICIAL);
  const [feedback, setFeedback] = useState<FeedbackState>(null);
  const [isSaving, setIsSaving] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [modoForm, setModoForm] = useState<"novo" | "edicao">("novo");

  // ── Derived
  const tpSel = TIPOS_CONTRATO.find((t) => t.codigo === form.tp_contrato);
  const tempoDeterminado = tpSel?.tempo_determinado ?? "Sim";
  const encerramentoEnabled = tempoDeterminado === "Não";
  const showDataBase = form.data_moeda === "Informado";
  const showValor = form.data_moeda === "Valor Fixo";

  const setField = useCallback(<K extends keyof FormContrato>(key: K, value: FormContrato[K]) => {
    setForm((p) => ({ ...p, [key]: value }));
    setFeedback(null);
  }, []);

  // ── Validation
  function validate(): boolean {
    if (!form.tp_contrato) { setFeedback({ type: "error", message: "Tipo de Contrato obrigatório." }); return false; }
    if (!form.fornecedor) { setFeedback({ type: "error", message: "Fornecedor obrigatório." }); return false; }
    if (!form.moeda) { setFeedback({ type: "error", message: "Moeda obrigatória." }); return false; }
    return true;
  }

  // ── Load by contrato
  async function handleLoadByCode() {
    if (!form.contrato.trim()) return;
    setIsLoading(true);
    setFeedback(null);
    try {
      const c = await buscarContrato(form.contrato.trim());
      if (!c) {
        setFeedback({ type: "info", message: `Contrato ${form.contrato} não encontrado.` });
        return;
      }
      setForm({
        contrato: c.contrato,
        tp_contrato: c.tp_contrato,
        contrato_for: c.contrato_for,
        fornecedor: c.fornecedor,
        abertura: c.abertura?.substring(0, 10) ?? today(),
        validade: c.validade?.substring(0, 10) ?? "",
        encerramento: c.encerramento?.substring(0, 10) ?? "",
        moeda: c.moeda,
        data_moeda: c.data_moeda || "Data Atual",
        data_base_conversao: c.data_base_conversao?.substring(0, 10) ?? "",
        valor: c.valor != null ? String(c.valor) : "",
        conta_financ: c.conta_financ,
        descricao: c.descricao,
        data_vcto: c.data_vcto?.substring(0, 10) ?? "",
        tipo_pgto: c.tipo_pgto,
        tipo_vcto: c.tipo_vcto,
        subsequente: c.subsequente,
      });
      setModoForm("edicao");
      setFeedback({ type: "info", message: `Contrato ${c.contrato} carregado para edição.` });
    } catch (error) {
      setFeedback({ type: "error", message: normalizeError(error, "Erro ao consultar contrato.") });
    } finally {
      setIsLoading(false);
    }
  }

  // ── Save
  async function handleSalvar() {
    if (!validate()) return;
    setIsSaving(true);
    setFeedback(null);
    try {
      const dto: ContratoDTO = {
        contrato: form.contrato || undefined,
        tp_contrato: form.tp_contrato,
        contrato_for: form.contrato_for,
        fornecedor: form.fornecedor,
        abertura: form.abertura,
        validade: form.validade,
        encerramento: encerramentoEnabled ? form.encerramento || undefined : undefined,
        moeda: form.moeda,
        data_moeda: form.data_moeda,
        data_base_conversao: showDataBase ? form.data_base_conversao : undefined,
        valor: showValor && form.valor ? Number(form.valor) : undefined,
        conta_financ: form.conta_financ,
        descricao: form.descricao,
        data_vcto: form.data_vcto,
        tipo_pgto: form.tipo_pgto,
        tipo_vcto: form.tipo_vcto,
        subsequente: form.subsequente,
      };
      await criarContrato(dto);
      setFeedback({ type: "success", message: `Contrato salvo com sucesso.` });
    } catch (error) {
      setFeedback({ type: "error", message: normalizeError(error, "Erro ao salvar contrato.") });
    } finally {
      setIsSaving(false);
    }
  }

  function handleNovo() {
    setForm(FORM_INICIAL);
    setModoForm("novo");
    setFeedback(null);
  }

  function handleLimpar() {
    handleNovo();
  }

  // ─── JSX ──────────────────────────────────────────────────────────────────

  return (
    <>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Inter:wght@300;400;500;600&display=swap');
        *, *::before, *::after { box-sizing: border-box; margin: 0; padding: 0; }

        .con2-root {
          min-height: 100vh; background: #f0f4ee;
          font-family: 'Inter', sans-serif; color: #1a2e22;
          display: flex; flex-direction: column;
        }

        .con2-topbar {
          height: 52px; background: #162e20;
          display: flex; align-items: center; justify-content: space-between;
          padding: 0 20px; flex-shrink: 0;
          border-bottom: 1px solid rgba(62,150,84,0.15);
        }
        .con2-topbar-left { display: flex; align-items: center; gap: 10px; }
        .con2-logo-mark {
          width: 28px; height: 28px; background: #3e9654;
          border-radius: 6px; display: flex; align-items: center; justify-content: center;
        }
        .con2-app-name { font-size: 13px; font-weight: 600; color: #e0f0e3; line-height: 1.1; }
        .con2-app-sub  { display: block; font-size: 9px; font-weight: 400; color: #3d6b4d; }
        .con2-screen-title {
          font-size: 12.5px; font-weight: 500; color: #5a9a6a;
          padding-left: 14px; margin-left: 14px;
          border-left: 1px solid rgba(255,255,255,0.08);
        }

        .con2-actionbar {
          background: #fff; border-bottom: 1px solid #dbe8d5;
          padding: 0 20px; display: flex; align-items: center;
          gap: 4px; height: 46px; flex-shrink: 0;
        }
        .con2-action-group {
          display: flex; align-items: center; gap: 4px;
          padding-right: 12px; margin-right: 8px;
          border-right: 1px solid #e8f0e4;
        }
        .con2-action-group:last-child { border-right: none; }
        .con2-action-label {
          font-size: 9.5px; font-weight: 600; letter-spacing: 0.8px;
          text-transform: uppercase; color: #96b8a0; margin-right: 4px; white-space: nowrap;
        }
        .con2-btn {
          display: inline-flex; align-items: center; gap: 6px;
          height: 32px; padding: 0 12px; border: 1.5px solid transparent;
          border-radius: 7px; font-family: 'Inter', sans-serif;
          font-size: 12.5px; font-weight: 500; cursor: pointer; white-space: nowrap;
          transition: background 0.13s, border-color 0.13s, color 0.13s;
        }
        .con2-btn-primary { background: #162e20; color: #dff0e2; border-color: #162e20; }
        .con2-btn-primary:hover:not(:disabled) { background: #1e3a2a; }
        .con2-btn-primary:disabled { opacity: 0.5; cursor: not-allowed; }
        .con2-btn-ghost { background: transparent; color: #4a7060; border-color: #d4e8d0; }
        .con2-btn-ghost:hover:not(:disabled) { background: #f0f8ec; border-color: #b0d4b8; color: #1a3828; }
        .con2-btn-ghost:disabled { opacity: 0.5; cursor: not-allowed; }
        .con2-btn-danger { background: transparent; color: #b94040; border-color: #f0c8c8; }
        .con2-btn-danger:hover:not(:disabled) { background: #fff0f0; border-color: #e09090; }
        .con2-btn-sm { height: 28px; padding: 0 9px; font-size: 12px; }
        .con2-btn-new {
          background: #eef9f0; color: #1a6030; border-color: #b4d8b8; font-weight: 600;
        }
        .con2-btn-new:hover:not(:disabled) { background: #dff5e4; border-color: #88c898; }

        .con2-body {
          flex: 1; padding: 16px 20px; display: flex;
          flex-direction: column; gap: 0; overflow-y: auto;
        }
        .con2-body::-webkit-scrollbar { width: 5px; }
        .con2-body::-webkit-scrollbar-thumb { background: #cce0c8; border-radius: 4px; }

        .con2-section-banner {
          display: flex; align-items: center; gap: 10px;
          padding: 14px 0 8px;
        }
        .con2-section-banner-pill {
          font-size: 9.5px; font-weight: 700; letter-spacing: 1.2px;
          text-transform: uppercase; color: #5a8068;
          background: #e0ede0; border: 1px solid #c8dcc8;
          border-radius: 20px; padding: 3px 10px; white-space: nowrap;
        }
        .con2-section-banner-line { flex: 1; height: 1px; background: #dbe8d5; }
        .con2-section-banner-hint { font-size: 11px; color: #96b8a0; white-space: nowrap; }

        .con2-card {
          background: #fff; border: 1px solid #dbe8d5;
          border-radius: 12px; overflow: hidden; margin-bottom: 14px;
        }
        .con2-card-header {
          display: flex; align-items: center; justify-content: space-between;
          padding: 12px 18px; border-bottom: 1px solid #edf5e8; background: #fafcf9;
        }
        .con2-card-header-left { display: flex; align-items: center; gap: 8px; }
        .con2-card-title { font-size: 12px; font-weight: 600; color: #2a4a35; text-transform: uppercase; letter-spacing: 0.6px; }
        .con2-card-badge {
          font-size: 10.5px; font-weight: 500; color: #3e9654;
          background: #eef5ea; border: 1px solid #c4dfc8; border-radius: 12px; padding: 2px 8px;
        }
        .con2-card-body { padding: 18px 18px; }

        .con2-modo-novo {
          display: inline-flex; align-items: center; gap: 5px;
          font-size: 11px; font-weight: 600; padding: 3px 10px;
          border-radius: 20px; background: #e8f5e0; color: #1e5818;
          border: 1px solid #a8d898;
        }
        .con2-modo-edicao {
          display: inline-flex; align-items: center; gap: 5px;
          font-size: 11px; font-weight: 600; padding: 3px 10px;
          border-radius: 20px; background: #fff8e0; color: #7a5200;
          border: 1px solid #e0c860;
        }
        .con2-modo-dot { width: 6px; height: 6px; border-radius: 50%; flex-shrink: 0; }
        .con2-modo-novo  .con2-modo-dot { background: #3e9654; }
        .con2-modo-edicao .con2-modo-dot { background: #c8a020; }

        .con2-filter-row { display: flex; align-items: flex-end; gap: 12px; flex-wrap: wrap; }

        .con2-grid { display: grid; grid-template-columns: repeat(12, 1fr); gap: 16px 14px; align-items: start; }
        .con2-col-2  { grid-column: span 2; }
        .con2-col-3  { grid-column: span 3; }
        .con2-col-4  { grid-column: span 4; }
        .con2-col-5  { grid-column: span 5; }
        .con2-col-6  { grid-column: span 6; }
        .con2-col-7  { grid-column: span 7; }
        .con2-col-8  { grid-column: span 8; }
        .con2-col-12 { grid-column: span 12; }

        .con2-field { display: flex; flex-direction: column; gap: 5px; }
        .con2-label {
          font-size: 10.5px; font-weight: 600; color: #5a8068;
          text-transform: uppercase; letter-spacing: 0.4px;
          display: flex; align-items: center; gap: 4px;
        }
        .con2-label-req { color: #c84040; font-size: 12px; line-height: 1; }
        .con2-input {
          width: 100%; height: 36px; background: #f8fbf6;
          border: 1.5px solid #d4e8cc; border-radius: 7px;
          padding: 0 10px; font-family: 'Inter', sans-serif;
          font-size: 13px; color: #1a2e22; outline: none;
          transition: border-color 0.13s, box-shadow 0.13s;
        }
        .con2-input:focus { border-color: #3e9654; box-shadow: 0 0 0 2px rgba(62,150,84,0.1); }
        .con2-input::placeholder { color: #b0c8b8; font-size: 12px; }
        .con2-input:disabled { background: #f0f4ee; color: #8aaa94; cursor: not-allowed; border-color: #e0ead8; }
        .con2-input[type="date"] { cursor: pointer; }

        .con2-select {
          width: 100%; height: 36px; background: #f8fbf6;
          border: 1.5px solid #d4e8cc; border-radius: 7px;
          padding: 0 28px 0 10px; font-family: 'Inter', sans-serif;
          font-size: 13px; color: #1a2e22; outline: none;
          appearance: none; cursor: pointer;
          background-image: url("data:image/svg+xml,%3Csvg width='10' height='6' viewBox='0 0 10 6' xmlns='http://www.w3.org/2000/svg'%3E%3Cpath d='M1 1l4 4 4-4' stroke='%23789a84' stroke-width='1.5' fill='none' stroke-linecap='round' stroke-linejoin='round'/%3E%3C/svg%3E");
          background-repeat: no-repeat; background-position: right 10px center;
          transition: border-color 0.13s;
        }
        .con2-select:focus { border-color: #3e9654; box-shadow: 0 0 0 2px rgba(62,150,84,0.1); }

        .con2-input-wrap { position: relative; display: flex; }
        .con2-input-btn {
          height: 36px; padding: 0 10px; flex-shrink: 0;
          background: #edf5ea; border: 1.5px solid #d4e8cc; border-left: none;
          border-radius: 0 7px 7px 0; display: flex; align-items: center;
          justify-content: center; gap: 5px;
          cursor: pointer; color: #3a6048;
          font-family: 'Inter', sans-serif; font-size: 11.5px; font-weight: 500;
          transition: background 0.12s; white-space: nowrap;
        }
        .con2-input-btn:hover { background: #ddf0e0; }
        .con2-input-btn:disabled { opacity: 0.4; cursor: not-allowed; }

        .con2-toggle-row { display: flex; align-items: center; gap: 10px; padding-top: 2px; }
        .con2-toggle { position: relative; width: 38px; height: 20px; flex-shrink: 0; cursor: pointer; }
        .con2-toggle input { opacity: 0; width: 0; height: 0; position: absolute; }
        .con2-toggle-track { position: absolute; inset: 0; background: #d4e0d0; border-radius: 20px; transition: background 0.2s; }
        .con2-toggle input:checked ~ .con2-toggle-track { background: #3e9654; }
        .con2-toggle-thumb {
          position: absolute; top: 3px; left: 3px; width: 14px; height: 14px;
          background: #fff; border-radius: 50%; transition: transform 0.2s;
          box-shadow: 0 1px 3px rgba(0,0,0,0.15);
        }
        .con2-toggle input:checked ~ .con2-toggle-thumb { transform: translateX(18px); }
        .con2-toggle-label { font-size: 13px; color: #3a5a45; font-weight: 500; }

        .con2-textarea {
          width: 100%; min-height: 72px; background: #f8fbf6;
          border: 1.5px solid #d4e8cc; border-radius: 7px;
          padding: 8px 10px; font-family: 'Inter', sans-serif;
          font-size: 13px; color: #1a2e22; outline: none; resize: vertical;
          transition: border-color 0.13s, box-shadow 0.13s;
        }
        .con2-textarea:focus { border-color: #3e9654; box-shadow: 0 0 0 2px rgba(62,150,84,0.1); }
        .con2-textarea::placeholder { color: #b0c8b8; font-size: 12px; }

        .con2-section-sep { height: 1px; background: #edf5e8; margin: 20px 0; }
        .con2-section-label {
          font-size: 10px; font-weight: 700; letter-spacing: 1px;
          text-transform: uppercase; color: #a0b8a8; margin-bottom: 14px;
          display: flex; align-items: center; gap: 8px;
        }
        .con2-section-label::after { content: ''; flex: 1; height: 1px; background: #e8f0e4; }

        .con2-feedback {
          display: flex; align-items: center; gap: 9px; padding: 11px 15px;
          border-radius: 9px; font-size: 13px; animation: con2FadeIn 0.2s ease;
          margin-bottom: 14px;
        }
        .con2-feedback.success { background: #f0faf2; border: 1px solid #b4dec0; color: #1e6030; }
        .con2-feedback.error   { background: #fff5f5; border: 1px solid #f8c0c0; border-left: 3px solid #e05252; color: #b91c1c; }
        .con2-feedback.info    { background: #f0f8ff; border: 1px solid #c7def8; border-left: 3px solid #4a90d9; color: #1a4070; }

        .con2-footer {
          background: #fff; border-top: 1px solid #dbe8d5;
          padding: 8px 20px; display: flex; align-items: center;
          justify-content: space-between; flex-shrink: 0;
        }
        .con2-footer-left { display: flex; align-items: center; gap: 20px; }
        .con2-footer-stat { display: flex; align-items: center; gap: 6px; font-size: 11.5px; color: #6a8a74; }
        .con2-footer-stat strong { color: #1a2e22; font-weight: 600; }

        @keyframes con2Spin { to { transform: rotate(360deg); } }
        .con2-spinner {
          width: 14px; height: 14px; flex-shrink: 0;
          border: 2px solid rgba(223,240,226,0.3); border-top-color: #dff0e2;
          border-radius: 50%; animation: con2Spin 0.65s linear infinite;
        }
        .con2-spinner-dark {
          width: 14px; height: 14px; flex-shrink: 0;
          border: 2px solid #d4e8cc; border-top-color: #3e9654;
          border-radius: 50%; animation: con2Spin 0.65s linear infinite;
        }
        @keyframes con2FadeIn { from { opacity: 0; transform: translateY(-4px); } to { opacity: 1; transform: translateY(0); } }
      `}</style>

      <div className="con2-root">
        {/* ── TOPBAR ── */}
        <header className="con2-topbar">
          <div className="con2-topbar-left">
            <div className="con2-logo-mark">
              <svg width="15" height="15" viewBox="0 0 18 18" fill="none">
                <rect x="1.5" y="1.5" width="6" height="6" rx="1.2" fill="rgba(255,255,255,0.9)" />
                <rect x="10.5" y="1.5" width="6" height="6" rx="1.2" fill="rgba(255,255,255,0.4)" />
                <rect x="1.5" y="10.5" width="6" height="6" rx="1.2" fill="rgba(255,255,255,0.4)" />
                <rect x="10.5" y="10.5" width="6" height="6" rx="1.2" fill="rgba(255,255,255,0.7)" />
              </svg>
            </div>
            <span className="con2-app-name">
              Venture<span className="con2-app-sub">ERP &amp; Soluções</span>
            </span>
            <span className="con2-screen-title">VCON0200 — Cadastro de Contratos de Fornecedores</span>
          </div>
        </header>

        {/* ── ACTION BAR ── */}
        <div className="con2-actionbar">
          <div className="con2-action-group">
            <span className="con2-action-label">Cadastro</span>
            <button className="con2-btn con2-btn-new" onClick={handleNovo} disabled={isSaving || isLoading}>
              <svg width="12" height="12" viewBox="0 0 12 12" fill="none">
                <path d="M6 2v8M2 6h8" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" />
              </svg>
              Novo
            </button>
          </div>

          <div className="con2-action-group">
            <span className="con2-action-label">Ações</span>
            <button className="con2-btn con2-btn-primary" onClick={() => void handleSalvar()} disabled={isSaving || isLoading}>
              {isSaving
                ? <><div className="con2-spinner" />Salvando...</>
                : <>
                    <svg width="13" height="13" viewBox="0 0 16 16" fill="none">
                      <path d="M2 2h9l3 3v9a1 1 0 01-1 1H3a1 1 0 01-1-1V3a1 1 0 011-1z" stroke="currentColor" strokeWidth="1.4" strokeLinejoin="round" />
                      <path d="M5 2v4h6V2M5 9h6" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" />
                    </svg>
                    Salvar
                  </>
              }
            </button>
            <button className="con2-btn con2-btn-danger" onClick={handleLimpar} disabled={isSaving || isLoading}>
              <svg width="13" height="13" viewBox="0 0 16 16" fill="none">
                <path d="M3 3l10 10M13 3L3 13" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
              </svg>
              Limpar
            </button>
          </div>

          <div className="con2-action-group">
            <button className="con2-btn con2-btn-ghost">
              <svg width="13" height="13" viewBox="0 0 16 16" fill="none">
                <circle cx="8" cy="8" r="6" stroke="currentColor" strokeWidth="1.4" />
                <path d="M8 7v4M8 5.5h.01" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" />
              </svg>
              Ajuda
            </button>
          </div>
        </div>

        {/* ── BODY ── */}
        <div className="con2-body">
          {feedback && (
            <div className={`con2-feedback ${feedback.type}`}>
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

          {/* ═══ SEÇÃO 1 — PESQUISAR ═══ */}
          <div className="con2-section-banner">
            <span className="con2-section-banner-pill">1 — Pesquisar</span>
            <div className="con2-section-banner-line" />
            <span className="con2-section-banner-hint">Informe o contrato e clique em Carregar</span>
          </div>

          <div className="con2-card">
            <div className="con2-card-header">
              <div className="con2-card-header-left">
                <svg width="14" height="14" viewBox="0 0 16 16" fill="none">
                  <circle cx="6.5" cy="6.5" r="4.5" stroke="#3e9654" strokeWidth="1.4" />
                  <path d="M10 10l3.5 3.5" stroke="#3e9654" strokeWidth="1.4" strokeLinecap="round" />
                </svg>
                <span className="con2-card-title">Pesquisa de Contratos</span>
              </div>
            </div>
            <div className="con2-card-body" style={{ paddingBottom: 14 }}>
              <div className="con2-filter-row">
                <div className="con2-field" style={{ flex: "0 0 200px" }}>
                  <label className="con2-label">Contrato</label>
                  <div className="con2-input-wrap">
                    <input
                      className="con2-input"
                      style={{ borderRadius: "7px 0 0 7px" }}
                      placeholder="Código do contrato"
                      value={form.contrato}
                      onChange={(e) => setField("contrato", e.target.value)}
                      onKeyDown={(e) => e.key === "Enter" && void handleLoadByCode()}
                    />
                    <button
                      className="con2-input-btn"
                      title="Carregar contrato"
                      type="button"
                      disabled={isLoading}
                      onClick={() => void handleLoadByCode()}
                    >
                      {isLoading
                        ? <div className="con2-spinner-dark" style={{ width: 12, height: 12 }} />
                        : <>
                            <svg width="12" height="12" viewBox="0 0 16 16" fill="none">
                              <circle cx="6.5" cy="6.5" r="4.5" stroke="currentColor" strokeWidth="1.4" />
                              <path d="M10 10l3.5 3.5" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" />
                            </svg>
                            Carregar
                          </>
                      }
                    </button>
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* ═══ SEÇÃO 2 — CRIAR / EDITAR ═══ */}
          <div className="con2-section-banner">
            <span className="con2-section-banner-pill">2 — Criar / Editar</span>
            <div className="con2-section-banner-line" />
            <span className="con2-section-banner-hint">
              {modoForm === "novo"
                ? "Preencha os campos e clique em Salvar para criar"
                : `Editando contrato — clique em Novo para cancelar`}
            </span>
          </div>

          <div className="con2-card">
            <div className="con2-card-header">
              <div className="con2-card-header-left">
                <svg width="14" height="14" viewBox="0 0 16 16" fill="none">
                  <path d="M2 2h9l3 3v9a1 1 0 01-1 1H3a1 1 0 01-1-1V3a1 1 0 011-1z" stroke="#3e9654" strokeWidth="1.4" strokeLinejoin="round" />
                  <path d="M5 2v4h6V2M5 9h6" stroke="#3e9654" strokeWidth="1.4" strokeLinecap="round" />
                </svg>
                <span className="con2-card-title">Contrato de Fornecedor</span>
              </div>
              {modoForm === "novo"
                ? <span className="con2-modo-novo"><span className="con2-modo-dot" />Novo Cadastro</span>
                : <span className="con2-modo-edicao"><span className="con2-modo-dot" />Editando</span>
              }
            </div>

            <div className="con2-card-body">
              <div className="con2-section-label">Dados do Contrato</div>
              <div className="con2-grid">
                {/* Contrato */}
                <div className="con2-field con2-col-2">
                  <label className="con2-label">Contrato</label>
                  <input
                    className="con2-input"
                    placeholder="Auto"
                    value={form.contrato}
                    onChange={(e) => setField("contrato", e.target.value)}
                  />
                </div>

                {/* Tp de Contrato */}
                <div className="con2-field con2-col-3">
                  <label className="con2-label">Tp de Contrato <span className="con2-label-req">*</span></label>
                  <select
                    className="con2-select"
                    value={form.tp_contrato}
                    onChange={(e) => setField("tp_contrato", e.target.value)}
                  >
                    <option value="">Selecione...</option>
                    {TIPOS_CONTRATO.map((t) => (
                      <option key={t.codigo} value={t.codigo}>{t.descricao}</option>
                    ))}
                  </select>
                </div>

                {/* Contrato For. */}
                <div className="con2-field con2-col-2">
                  <label className="con2-label">Contrato For.</label>
                  <input
                    className="con2-input"
                    placeholder="Ex: CT-001"
                    value={form.contrato_for}
                    onChange={(e) => setField("contrato_for", e.target.value)}
                  />
                </div>

                {/* Fornecedor */}
                <div className="con2-field con2-col-5">
                  <label className="con2-label">Fornecedor <span className="con2-label-req">*</span></label>
                  <select
                    className="con2-select"
                    value={form.fornecedor}
                    onChange={(e) => setField("fornecedor", e.target.value)}
                  >
                    <option value="">Selecione...</option>
                    {FORNECEDORES.map((f) => (
                      <option key={f.code} value={f.code}>{f.code} - {f.nome}</option>
                    ))}
                  </select>
                </div>
              </div>

              <div className="con2-section-sep" />

              <div className="con2-section-label">Datas</div>
              <div className="con2-grid">
                {/* Abertura */}
                <div className="con2-field con2-col-3">
                  <label className="con2-label">Abertura <span className="con2-label-req">*</span></label>
                  <input
                    type="date"
                    className="con2-input"
                    value={form.abertura}
                    onChange={(e) => setField("abertura", e.target.value)}
                  />
                </div>

                {/* Validade */}
                <div className="con2-field con2-col-3">
                  <label className="con2-label">Validade</label>
                  <input
                    type="date"
                    className="con2-input"
                    value={form.validade}
                    onChange={(e) => setField("validade", e.target.value)}
                  />
                </div>

                {/* Encerramento */}
                <div className="con2-field con2-col-3">
                  <label className="con2-label">Encerramento</label>
                  <input
                    type="date"
                    className="con2-input"
                    value={form.encerramento}
                    onChange={(e) => setField("encerramento", e.target.value)}
                    disabled={!encerramentoEnabled}
                  />
                </div>
              </div>

              <div className="con2-section-sep" />

              <div className="con2-section-label">Financeiro</div>
              <div className="con2-grid">
                {/* Moeda */}
                <div className="con2-field con2-col-3">
                  <label className="con2-label">Moeda <span className="con2-label-req">*</span></label>
                  <select
                    className="con2-select"
                    value={form.moeda}
                    onChange={(e) => setField("moeda", e.target.value)}
                  >
                    <option value="">Selecione...</option>
                    {MOEDAS.map((m) => (
                      <option key={m} value={m}>{m}</option>
                    ))}
                  </select>
                </div>

                {/* Data Moeda */}
                <div className="con2-field con2-col-3">
                  <label className="con2-label">Data Moeda</label>
                  <select
                    className="con2-select"
                    value={form.data_moeda}
                    onChange={(e) => setField("data_moeda", e.target.value)}
                  >
                    {DATA_MOEDA_OPTS.map((o) => (
                      <option key={o} value={o}>{o}</option>
                    ))}
                  </select>
                </div>

                {/* Data Base Conversão (condicional) */}
                {showDataBase && (
                  <div className="con2-field con2-col-3">
                    <label className="con2-label">Data Base Conversão</label>
                    <input
                      type="date"
                      className="con2-input"
                      value={form.data_base_conversao}
                      onChange={(e) => setField("data_base_conversao", e.target.value)}
                    />
                  </div>
                )}

                {/* Valor (condicional) */}
                {showValor && (
                  <div className="con2-field con2-col-3">
                    <label className="con2-label">Valor</label>
                    <input
                      className="con2-input"
                      placeholder="0,00"
                      type="number"
                      value={form.valor}
                      onChange={(e) => setField("valor", e.target.value)}
                    />
                  </div>
                )}
              </div>

              <div className="con2-section-sep" />

              <div className="con2-section-label">Pagamento</div>
              <div className="con2-grid">
                {/* Conta Financ. */}
                <div className="con2-field con2-col-4">
                  <label className="con2-label">Conta Financ.</label>
                  <select
                    className="con2-select"
                    value={form.conta_financ}
                    onChange={(e) => setField("conta_financ", e.target.value)}
                  >
                    <option value="">Selecione...</option>
                    {CONTAS_FINANC.map((c) => (
                      <option key={c} value={c}>{c}</option>
                    ))}
                  </select>
                </div>

                {/* Descrição */}
                <div className="con2-field con2-col-8">
                  <label className="con2-label">Descrição</label>
                  <textarea
                    className="con2-textarea"
                    placeholder="Descrição do contrato (máx. 2000 caracteres)"
                    value={form.descricao}
                    onChange={(e) => setField("descricao", e.target.value)}
                    maxLength={2000}
                  />
                </div>
              </div>

              <div className="con2-grid" style={{ marginTop: 16 }}>
                {/* Data Vcto */}
                <div className="con2-field con2-col-3">
                  <label className="con2-label">Data Vcto</label>
                  <input
                    type="date"
                    className="con2-input"
                    value={form.data_vcto}
                    onChange={(e) => setField("data_vcto", e.target.value)}
                  />
                </div>

                {/* Tipo de Pgto */}
                <div className="con2-field con2-col-3">
                  <label className="con2-label">Tipo de Pgto</label>
                  <select
                    className="con2-select"
                    value={form.tipo_pgto}
                    onChange={(e) => setField("tipo_pgto", e.target.value)}
                  >
                    <option value="">Selecione...</option>
                    {TIPOS_PGTO.map((t) => (
                      <option key={t} value={t}>{t}</option>
                    ))}
                  </select>
                </div>

                {/* Tipo de Vcto */}
                <div className="con2-field con2-col-3">
                  <label className="con2-label">Tipo de Vcto</label>
                  <select
                    className="con2-select"
                    value={form.tipo_vcto}
                    onChange={(e) => setField("tipo_vcto", e.target.value)}
                  >
                    <option value="">Selecione...</option>
                    {TIPOS_VCTO.map((t) => (
                      <option key={t} value={t}>{t}</option>
                    ))}
                  </select>
                </div>

                {/* Subsequente */}
                <div className="con2-field con2-col-3">
                  <label className="con2-label">Subsequente?</label>
                  <div style={{ paddingTop: 6 }}>
                    <div className="con2-toggle-row">
                      <label className="con2-toggle">
                        <input
                          type="checkbox"
                          checked={form.subsequente}
                          onChange={(e) => setField("subsequente", e.target.checked)}
                        />
                        <div className="con2-toggle-track" />
                        <div className="con2-toggle-thumb" />
                      </label>
                      <span className="con2-toggle-label">
                        {form.subsequente ? "Sim" : "Não"}
                      </span>
                    </div>
                  </div>
                </div>
              </div>

              {/* Botões Adicionais */}
              <div style={{ display: "flex", gap: 8, marginTop: 20, paddingTop: 16, borderTop: "1px solid #edf5e8" }}>
                <button className="con2-btn con2-btn-ghost" type="button">
                  <svg width="12" height="12" viewBox="0 0 12 12" fill="none">
                    <path d="M6 2v8M2 6h8" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" />
                  </svg>
                  Acréscimo/Desconto
                </button>
                <button className="con2-btn con2-btn-ghost" type="button">
                  <svg width="12" height="12" viewBox="0 0 12 12" fill="none">
                    <rect x="1" y="3" width="10" height="7" rx="1" stroke="currentColor" strokeWidth="1.2" />
                    <path d="M1 6h10" stroke="currentColor" strokeWidth="1.2" />
                  </svg>
                  Pagamentos
                </button>
                <button className="con2-btn con2-btn-ghost" type="button">
                  <svg width="12" height="12" viewBox="0 0 16 16" fill="none">
                    <circle cx="6.5" cy="6.5" r="4.5" stroke="currentColor" strokeWidth="1.4" />
                    <path d="M10 10l3.5 3.5" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" />
                  </svg>
                  Resumo
                </button>
              </div>
            </div>
          </div>
        </div>

        {/* ── FOOTER ── */}
        <footer className="con2-footer">
          <div className="con2-footer-left">
            <div className="con2-footer-stat">Modo: <strong>{modoForm === "novo" ? "Novo" : "Edição"}</strong></div>
            <div className="con2-footer-stat">Módulo: <strong>Suprimento</strong></div>
          </div>
          <div className="con2-footer-stat" style={{ gap: 8 }}>
            <span style={{ color: "#b0c8b8", fontSize: 11 }}>GRUPO VENTURE LTDA</span>
          </div>
        </footer>
      </div>
    </>
  );
}
