import { useState, useCallback } from "react";

// ─── Types ────────────────────────────────────────────────────────────────────

type FeedbackState = { type: "success" | "error" | "info"; message: string } | null;
type AbaAtiva = "dados" | "telefones" | "emails" | "transporte" | "processo";

interface FormAvr {
  codigo: string;
  ativo: boolean;
  representante: boolean;
  cliente: boolean;
  descricao: string;
  fantasia: string;
  cep: string;
  cidade: string;
  uf: string;
  endereco: string;
  logradouro: string;
  complemento: string;
  bairro: string;
  pessoa: string;
  cnpj: string;
  cpf: string;
  inscr_est: string;
  inscr_mun: string;
  tipo_frete: string;
  dt_cadastro: string;
  codigo_pai: string;
  tipo: string;
  obr_viticola: string;
  codigo_gln: string;
  registro_ma: string;
  contrib_icms: string;
  mei: boolean;
  plataforma_rastreio: string;
  telefone: string;
  email: string;
  transp: string;
}

interface Telefone {
  tipo: string;
  ddd: string;
  numero: string;
  contato: string;
}

interface Email {
  tipo: string;
  email: string;
  contato: string;
}

interface Transporte {
  placa: string;
  uf: string;
  tipo: string;
}

function today(): string {
  return new Date().toISOString().substring(0, 10);
}

const FORM_INICIAL: FormAvr = {
  codigo: "",
  ativo: true,
  representante: false,
  cliente: false,
  descricao: "",
  fantasia: "",
  cep: "",
  cidade: "",
  uf: "",
  endereco: "",
  logradouro: "",
  complemento: "",
  bairro: "",
  pessoa: "Jurídica",
  cnpj: "",
  cpf: "",
  inscr_est: "",
  inscr_mun: "",
  tipo_frete: "",
  dt_cadastro: today(),
  codigo_pai: "",
  tipo: "Fornecedor",
  obr_viticola: "Nunca",
  codigo_gln: "",
  registro_ma: "",
  contrib_icms: "",
  mei: false,
  plataforma_rastreio: "",
  telefone: "",
  email: "",
  transp: "",
};

const PESSOA_OPTS = ["Jurídica", "Física"];
const TIPO_FRETE_OPTS = ["Cif", "Daf", "Fob", "Sem Frete", "Convênio", "Retira", "Cortesia", "Terceiros"];
const TIPO_OPTS = ["Fornecedor", "Transportadora", "Transp. Redesp.", "Redespacho"];
const OBR_VITICOLA_OPTS = ["Nunca", "Às Vezes", "Sempre"];
const CONTRIB_ICMS_OPTS = ["1 - Contribuinte", "2 - Não Contribuinte", "3 - Isento"];
const PLATAFORMA_OPTS = ["OnixSat", "Sascar", "Omnilink", "Autotrac", "Outra"];

const CIDADES_MOCK = ["São Paulo", "Campinas", "Rio de Janeiro", "Belo Horizonte", "Curitiba"];
const UFS_MOCK = ["SP", "RJ", "MG", "PR", "RS"];

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

export function Vavr0200Page(): JSX.Element {
  const [form, setForm] = useState<FormAvr>(FORM_INICIAL);
  const [abaAtiva, setAbaAtiva] = useState<AbaAtiva>("dados");
  const [feedback, setFeedback] = useState<FeedbackState>(null);
  const [isSaving, setIsSaving] = useState(false);

  const [telefones, setTelefones] = useState<Telefone[]>([]);
  const [emails, setEmails] = useState<Email[]>([]);
  const [transportes, setTransportes] = useState<Transporte[]>([]);

  const [novoTel, setNovoTel] = useState<Telefone>({ tipo: "", ddd: "", numero: "", contato: "" });
  const [novoEmail, setNovoEmail] = useState<Email>({ tipo: "", email: "", contato: "" });
  const [novoTransp, setNovoTransp] = useState<Transporte>({ placa: "", uf: "", tipo: "" });

  const setField = useCallback(<K extends keyof FormAvr>(key: K, value: FormAvr[K]) => {
    setForm((p) => ({ ...p, [key]: value }));
    setFeedback(null);
  }, []);

  function validate(): boolean {
    if (!form.descricao.trim()) { setFeedback({ type: "error", message: "Descrição obrigatória." }); return false; }
    return true;
  }

  async function handleSalvar() {
    if (!validate()) return;
    setIsSaving(true);
    setFeedback(null);
    try {
      await new Promise((r) => setTimeout(r, 800));
      setFeedback({ type: "success", message: `Cadastro "${form.descricao}" salvo com sucesso.` });
    } catch (error) {
      setFeedback({ type: "error", message: normalizeError(error, "Erro ao salvar.") });
    } finally {
      setIsSaving(false);
    }
  }

  function handleNovo() {
    setForm(FORM_INICIAL);
    setTelefones([]);
    setEmails([]);
    setTransportes([]);
    setFeedback(null);
  }

  function handleLimpar() { handleNovo(); }

  function addTelefone() {
    if (!novoTel.numero.trim() && !novoTel.ddd.trim()) return;
    setTelefones((p) => [...p, { ...novoTel }]);
    setNovoTel({ tipo: "", ddd: "", numero: "", contato: "" });
  }

  function removeTelefone(idx: number) {
    setTelefones((p) => p.filter((_, i) => i !== idx));
  }

  function addEmail() {
    if (!novoEmail.email.trim()) return;
    setEmails((p) => [...p, { ...novoEmail }]);
    setNovoEmail({ tipo: "", email: "", contato: "" });
  }

  function removeEmail(idx: number) {
    setEmails((p) => p.filter((_, i) => i !== idx));
  }

  function addTransporte() {
    if (!novoTransp.placa.trim()) return;
    setTransportes((p) => [...p, { ...novoTransp }]);
    setNovoTransp({ placa: "", uf: "", tipo: "" });
  }

  function removeTransporte(idx: number) {
    setTransportes((p) => p.filter((_, i) => i !== idx));
  }

  const pessoaFisica = form.pessoa === "Física";

  const ABAS: { id: AbaAtiva; label: string }[] = [
    { id: "dados", label: "Dados Gerais" },
    { id: "telefones", label: `Telefones${telefones.length > 0 ? ` (${telefones.length})` : ""}` },
    { id: "emails", label: `E-mails${emails.length > 0 ? ` (${emails.length})` : ""}` },
    { id: "transporte", label: `Transporte${transportes.length > 0 ? ` (${transportes.length})` : ""}` },
    { id: "processo", label: "Informações do Processo" },
  ];

  // ─── JSX ──────────────────────────────────────────────────────────────────

  return (
    <>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Inter:wght@300;400;500;600&display=swap');
        *, *::before, *::after { box-sizing: border-box; margin: 0; padding: 0; }

        .avr-root {
          min-height: 100vh; background: #f0f4ee;
          font-family: 'Inter', sans-serif; color: #1a2e22;
          display: flex; flex-direction: column;
        }

        .avr-topbar {
          height: 52px; background: #162e20;
          display: flex; align-items: center; justify-content: space-between;
          padding: 0 20px; flex-shrink: 0;
          border-bottom: 1px solid rgba(62,150,84,0.15);
        }
        .avr-topbar-left { display: flex; align-items: center; gap: 10px; }
        .avr-logo-mark {
          width: 28px; height: 28px; background: #3e9654;
          border-radius: 6px; display: flex; align-items: center; justify-content: center;
        }
        .avr-app-name { font-size: 13px; font-weight: 600; color: #e0f0e3; line-height: 1.1; }
        .avr-app-sub  { display: block; font-size: 9px; font-weight: 400; color: #3d6b4d; }
        .avr-screen-title {
          font-size: 12.5px; font-weight: 500; color: #5a9a6a;
          padding-left: 14px; margin-left: 14px;
          border-left: 1px solid rgba(255,255,255,0.08);
        }

        .avr-actionbar {
          background: #fff; border-bottom: 1px solid #dbe8d5;
          padding: 0 20px; display: flex; align-items: center;
          gap: 4px; height: 46px; flex-shrink: 0;
        }
        .avr-action-group {
          display: flex; align-items: center; gap: 4px;
          padding-right: 12px; margin-right: 8px;
          border-right: 1px solid #e8f0e4;
        }
        .avr-action-group:last-child { border-right: none; }
        .avr-action-label {
          font-size: 9.5px; font-weight: 600; letter-spacing: 0.8px;
          text-transform: uppercase; color: #96b8a0; margin-right: 4px; white-space: nowrap;
        }
        .avr-btn {
          display: inline-flex; align-items: center; gap: 6px;
          height: 32px; padding: 0 12px; border: 1.5px solid transparent;
          border-radius: 7px; font-family: 'Inter', sans-serif;
          font-size: 12.5px; font-weight: 500; cursor: pointer; white-space: nowrap;
          transition: background 0.13s, border-color 0.13s, color 0.13s;
        }
        .avr-btn-primary { background: #162e20; color: #dff0e2; border-color: #162e20; }
        .avr-btn-primary:hover:not(:disabled) { background: #1e3a2a; }
        .avr-btn-primary:disabled { opacity: 0.5; cursor: not-allowed; }
        .avr-btn-ghost { background: transparent; color: #4a7060; border-color: #d4e8d0; }
        .avr-btn-ghost:hover:not(:disabled) { background: #f0f8ec; border-color: #b0d4b8; color: #1a3828; }
        .avr-btn-danger { background: transparent; color: #b94040; border-color: #f0c8c8; }
        .avr-btn-danger:hover:not(:disabled) { background: #fff0f0; border-color: #e09090; }
        .avr-btn-new {
          background: #eef9f0; color: #1a6030; border-color: #b4d8b8; font-weight: 600;
        }
        .avr-btn-new:hover:not(:disabled) { background: #dff5e4; border-color: #88c898; }

        .avr-body {
          flex: 1; padding: 16px 20px; display: flex;
          flex-direction: column; gap: 0; overflow-y: auto;
        }
        .avr-body::-webkit-scrollbar { width: 5px; }
        .avr-body::-webkit-scrollbar-thumb { background: #cce0c8; border-radius: 4px; }

        .avr-section-banner {
          display: flex; align-items: center; gap: 10px;
          padding: 14px 0 8px;
        }
        .avr-section-banner:first-child { padding-top: 0; }
        .avr-section-banner-pill {
          font-size: 9.5px; font-weight: 700; letter-spacing: 1.2px;
          text-transform: uppercase; color: #5a8068;
          background: #e0ede0; border: 1px solid #c8dcc8;
          border-radius: 20px; padding: 3px 10px; white-space: nowrap;
        }
        .avr-section-banner-line { flex: 1; height: 1px; background: #dbe8d5; }
        .avr-section-banner-hint { font-size: 11px; color: #96b8a0; white-space: nowrap; }

        .avr-card {
          background: #fff; border: 1px solid #dbe8d5;
          border-radius: 12px; overflow: hidden; margin-bottom: 14px;
        }
        .avr-card-header {
          display: flex; align-items: center; justify-content: space-between;
          padding: 12px 18px; border-bottom: 1px solid #edf5e8; background: #fafcf9;
        }
        .avr-card-header-left { display: flex; align-items: center; gap: 8px; }
        .avr-card-title { font-size: 12px; font-weight: 600; color: #2a4a35; text-transform: uppercase; letter-spacing: 0.6px; }

        .avr-tabs {
          display: flex; align-items: flex-end; gap: 0;
          border-bottom: 2px solid #dbe8d5; background: #fafcf9;
        }
        .avr-tab {
          padding: 10px 20px; font-size: 12.5px; font-weight: 500;
          color: #6a8a74; cursor: pointer; border: none; background: transparent;
          border-bottom: 2px solid transparent; margin-bottom: -2px;
          transition: color 0.13s, border-color 0.13s; white-space: nowrap;
          font-family: 'Inter', sans-serif;
        }
        .avr-tab:hover { color: #2a4a35; }
        .avr-tab.active { color: #162e20; border-bottom-color: #3e9654; font-weight: 600; }
        .avr-tab-body { padding: 20px 18px; }

        .avr-grid { display: grid; grid-template-columns: repeat(12, 1fr); gap: 16px 14px; align-items: start; }
        .avr-col-2  { grid-column: span 2; }
        .avr-col-3  { grid-column: span 3; }
        .avr-col-4  { grid-column: span 4; }
        .avr-col-5  { grid-column: span 5; }
        .avr-col-6  { grid-column: span 6; }
        .avr-col-8  { grid-column: span 8; }
        .avr-col-12 { grid-column: span 12; }

        .avr-field { display: flex; flex-direction: column; gap: 5px; }
        .avr-label {
          font-size: 10.5px; font-weight: 600; color: #5a8068;
          text-transform: uppercase; letter-spacing: 0.4px;
          display: flex; align-items: center; gap: 4px;
        }
        .avr-label-req { color: #c84040; font-size: 12px; line-height: 1; }
        .avr-input {
          width: 100%; height: 36px; background: #f8fbf6;
          border: 1.5px solid #d4e8cc; border-radius: 7px;
          padding: 0 10px; font-family: 'Inter', sans-serif;
          font-size: 13px; color: #1a2e22; outline: none;
          transition: border-color 0.13s, box-shadow 0.13s;
        }
        .avr-input:focus { border-color: #3e9654; box-shadow: 0 0 0 2px rgba(62,150,84,0.1); }
        .avr-input::placeholder { color: #b0c8b8; font-size: 12px; }
        .avr-input:disabled { background: #f0f4ee; color: #8aaa94; cursor: not-allowed; border-color: #e0ead8; }
        .avr-input[type="date"] { cursor: pointer; }

        .avr-select {
          width: 100%; height: 36px; background: #f8fbf6;
          border: 1.5px solid #d4e8cc; border-radius: 7px;
          padding: 0 28px 0 10px; font-family: 'Inter', sans-serif;
          font-size: 13px; color: #1a2e22; outline: none;
          appearance: none; cursor: pointer;
          background-image: url("data:image/svg+xml,%3Csvg width='10' height='6' viewBox='0 0 10 6' xmlns='http://www.w3.org/2000/svg'%3E%3Cpath d='M1 1l4 4 4-4' stroke='%23789a84' stroke-width='1.5' fill='none' stroke-linecap='round' stroke-linejoin='round'/%3E%3C/svg%3E");
          background-repeat: no-repeat; background-position: right 10px center;
          transition: border-color 0.13s;
        }
        .avr-select:focus { border-color: #3e9654; box-shadow: 0 0 0 2px rgba(62,150,84,0.1); }

        .avr-toggle-row { display: flex; align-items: center; gap: 10px; padding-top: 2px; }
        .avr-toggle { position: relative; width: 38px; height: 20px; flex-shrink: 0; cursor: pointer; }
        .avr-toggle input { opacity: 0; width: 0; height: 0; position: absolute; }
        .avr-toggle-track { position: absolute; inset: 0; background: #d4e0d0; border-radius: 20px; transition: background 0.2s; }
        .avr-toggle input:checked ~ .avr-toggle-track { background: #3e9654; }
        .avr-toggle-thumb {
          position: absolute; top: 3px; left: 3px; width: 14px; height: 14px;
          background: #fff; border-radius: 50%; transition: transform 0.2s;
          box-shadow: 0 1px 3px rgba(0,0,0,0.15);
        }
        .avr-toggle input:checked ~ .avr-toggle-thumb { transform: translateX(18px); }
        .avr-toggle.disabled { opacity: 0.45; cursor: not-allowed; pointer-events: none; }
        .avr-toggle-label { font-size: 13px; color: #3a5a45; font-weight: 500; }

        .avr-section-sep { height: 1px; background: #edf5e8; margin: 20px 0; }
        .avr-section-label {
          font-size: 10px; font-weight: 700; letter-spacing: 1px;
          text-transform: uppercase; color: #a0b8a8; margin-bottom: 14px;
          display: flex; align-items: center; gap: 8px;
        }
        .avr-section-label::after { content: ''; flex: 1; height: 1px; background: #e8f0e4; }

        .avr-feedback {
          display: flex; align-items: center; gap: 9px; padding: 11px 15px;
          border-radius: 9px; font-size: 13px; animation: avrFadeIn 0.2s ease;
          margin-bottom: 14px;
        }
        .avr-feedback.success { background: #f0faf2; border: 1px solid #b4dec0; color: #1e6030; }
        .avr-feedback.error   { background: #fff5f5; border: 1px solid #f8c0c0; border-left: 3px solid #e05252; color: #b91c1c; }
        .avr-feedback.info    { background: #f0f8ff; border: 1px solid #c7def8; border-left: 3px solid #4a90d9; color: #1a4070; }

        .avr-footer {
          background: #fff; border-top: 1px solid #dbe8d5;
          padding: 8px 20px; display: flex; align-items: center;
          justify-content: space-between; flex-shrink: 0;
        }
        .avr-footer-left { display: flex; align-items: center; gap: 20px; }
        .avr-footer-stat { display: flex; align-items: center; gap: 6px; font-size: 11.5px; color: #6a8a74; }
        .avr-footer-stat strong { color: #1a2e22; font-weight: 600; }

        .avr-check-group { display: flex; align-items: center; gap: 18px; flex-wrap: wrap; padding-top: 4px; }

        .avr-table { width: 100%; border-collapse: collapse; font-size: 13px; }
        .avr-table th {
          background: #f4f9f2; padding: 8px 12px; text-align: left;
          font-size: 10.5px; font-weight: 700; color: #5a8068;
          text-transform: uppercase; letter-spacing: 0.5px;
          border-bottom: 1.5px solid #dbe8d5;
        }
        .avr-table td { padding: 9px 12px; border-bottom: 1px solid #f0f6ec; color: #243830; }
        .avr-table-empty { text-align: center; padding: 28px 12px; color: #96b8a0; font-size: 12.5px; }
        .avr-remove-btn {
          background: transparent; border: none; cursor: pointer; color: #c89090;
          padding: 3px 6px; border-radius: 5px; font-size: 12px; font-family: 'Inter', sans-serif;
          transition: background 0.12s, color 0.12s;
        }
        .avr-remove-btn:hover { background: #fdecea; color: #b94040; }

        .avr-add-row { display: flex; align-items: flex-end; gap: 10px; margin-bottom: 16px; flex-wrap: wrap; }

        @keyframes avrSpin { to { transform: rotate(360deg); } }
        .avr-spinner {
          width: 14px; height: 14px; flex-shrink: 0;
          border: 2px solid rgba(223,240,226,0.3); border-top-color: #dff0e2;
          border-radius: 50%; animation: avrSpin 0.65s linear infinite;
        }
        @keyframes avrFadeIn { from { opacity: 0; transform: translateY(-4px); } to { opacity: 1; transform: translateY(0); } }
      `}</style>

      <div className="avr-root">
        {/* ── TOPBAR ── */}
        <header className="avr-topbar">
          <div className="avr-topbar-left">
            <div className="avr-logo-mark">
              <svg width="15" height="15" viewBox="0 0 18 18" fill="none">
                <rect x="1.5" y="1.5" width="6" height="6" rx="1.2" fill="rgba(255,255,255,0.9)" />
                <rect x="10.5" y="1.5" width="6" height="6" rx="1.2" fill="rgba(255,255,255,0.4)" />
                <rect x="1.5" y="10.5" width="6" height="6" rx="1.2" fill="rgba(255,255,255,0.4)" />
                <rect x="10.5" y="10.5" width="6" height="6" rx="1.2" fill="rgba(255,255,255,0.7)" />
              </svg>
            </div>
            <span className="avr-app-name">
              Venture<span className="avr-app-sub">ERP &amp; Soluções</span>
            </span>
            <span className="avr-screen-title">VAVR0200 — Cadastro de Aviso de Recebimento</span>
          </div>
        </header>

        {/* ── ACTION BAR ── */}
        <div className="avr-actionbar">
          <div className="avr-action-group">
            <span className="avr-action-label">Cadastro</span>
            <button className="avr-btn avr-btn-new" onClick={handleNovo} disabled={isSaving}>
              <svg width="12" height="12" viewBox="0 0 12 12" fill="none">
                <path d="M6 2v8M2 6h8" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" />
              </svg>
              Novo
            </button>
          </div>
          <div className="avr-action-group">
            <span className="avr-action-label">Ações</span>
            <button className="avr-btn avr-btn-primary" onClick={() => void handleSalvar()} disabled={isSaving}>
              {isSaving
                ? <><div className="avr-spinner" />Salvando...</>
                : <>
                    <svg width="13" height="13" viewBox="0 0 16 16" fill="none">
                      <path d="M2 2h9l3 3v9a1 1 0 01-1 1H3a1 1 0 01-1-1V3a1 1 0 011-1z" stroke="currentColor" strokeWidth="1.4" strokeLinejoin="round" />
                      <path d="M5 2v4h6V2M5 9h6" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" />
                    </svg>
                    Salvar
                  </>
              }
            </button>
            <button className="avr-btn avr-btn-danger" onClick={handleLimpar} disabled={isSaving}>
              <svg width="13" height="13" viewBox="0 0 16 16" fill="none">
                <path d="M3 3l10 10M13 3L3 13" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
              </svg>
              Limpar
            </button>
          </div>
          <div className="avr-action-group">
            <button className="avr-btn avr-btn-ghost">
              <svg width="13" height="13" viewBox="0 0 16 16" fill="none">
                <circle cx="8" cy="8" r="6" stroke="currentColor" strokeWidth="1.4" />
                <path d="M8 7v4M8 5.5h.01" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" />
              </svg>
              Ajuda
            </button>
          </div>
        </div>

        {/* ── BODY ── */}
        <div className="avr-body">
          {feedback && (
            <div className={`avr-feedback ${feedback.type}`}>
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

          <div className="avr-section-banner">
            <span className="avr-section-banner-pill">Cadastro</span>
            <div className="avr-section-banner-line" />
            <span className="avr-section-banner-hint">Preencha os dados e clique em Salvar</span>
          </div>

          <div className="avr-card">
            <div className="avr-card-header">
              <div className="avr-card-header-left">
                <svg width="14" height="14" viewBox="0 0 16 16" fill="none">
                  <path d="M2 2h9l3 3v9a1 1 0 01-1 1H3a1 1 0 01-1-1V3a1 1 0 011-1z" stroke="#3e9654" strokeWidth="1.4" strokeLinejoin="round" />
                  <path d="M5 2v4h6V2M5 9h6" stroke="#3e9654" strokeWidth="1.4" strokeLinecap="round" />
                </svg>
                <span className="avr-card-title">Fornecedor / Transportadora</span>
              </div>
            </div>

            <div className="avr-tabs">
              {ABAS.map((aba) => (
                <button
                  key={aba.id}
                  className={`avr-tab${abaAtiva === aba.id ? " active" : ""}`}
                  onClick={() => setAbaAtiva(aba.id)}
                >
                  {aba.label}
                </button>
              ))}
            </div>

            {/* ── ABA: DADOS GERAIS ── */}
            {abaAtiva === "dados" && (
              <div className="avr-tab-body">
                <div className="avr-section-label">Identificação</div>
                <div className="avr-grid">
                  <div className="avr-field avr-col-2">
                    <label className="avr-label">Código</label>
                    <input className="avr-input" value={form.codigo} onChange={(e) => setField("codigo", e.target.value)} placeholder="Auto" disabled />
                  </div>
                  <div className="avr-field avr-col-8">
                    <label className="avr-label">Descrição <span className="avr-label-req">*</span></label>
                    <input className="avr-input" value={form.descricao} onChange={(e) => setField("descricao", e.target.value)} placeholder="Razão social ou nome" />
                  </div>
                  <div className="avr-field avr-col-2">
                    <label className="avr-label">Checkboxes</label>
                    <div className="avr-check-group">
                      <div className="avr-toggle-row">
                        <label className="avr-toggle"><input type="checkbox" checked={form.ativo} onChange={(e) => setField("ativo", e.target.checked)} /><div className="avr-toggle-track" /><div className="avr-toggle-thumb" /></label>
                        <span className="avr-toggle-label">Ativo</span>
                      </div>
                    </div>
                  </div>
                </div>

                <div className="avr-grid" style={{ marginTop: 0 }}>
                  <div className="avr-field avr-col-6">
                    <label className="avr-label">Fantasia</label>
                    <input className="avr-input" value={form.fantasia} onChange={(e) => setField("fantasia", e.target.value)} placeholder="Nome fantasia" />
                  </div>
                  <div className="avr-field avr-col-3">
                    <label className="avr-label">CEP</label>
                    <input className="avr-input" value={form.cep} onChange={(e) => setField("cep", e.target.value)} placeholder="00000-000" />
                  </div>
                  <div className="avr-field avr-col-3">
                    <label className="avr-label">Cidade</label>
                    <select className="avr-select" value={form.cidade} onChange={(e) => setField("cidade", e.target.value)}>
                      <option value="">Selecione...</option>
                      {CIDADES_MOCK.map((c) => <option key={c} value={c}>{c}</option>)}
                    </select>
                  </div>
                </div>

                <div className="avr-grid" style={{ marginTop: 16 }}>
                  <div className="avr-field avr-col-2">
                    <label className="avr-label">UF</label>
                    <select className="avr-select" value={form.uf} onChange={(e) => setField("uf", e.target.value)}>
                      <option value="">Selecione...</option>
                      {UFS_MOCK.map((u) => <option key={u} value={u}>{u}</option>)}
                    </select>
                  </div>
                  <div className="avr-field avr-col-4">
                    <label className="avr-label">Endereço</label>
                    <input className="avr-input" value={form.endereco} onChange={(e) => setField("endereco", e.target.value)} placeholder="Endereço" />
                  </div>
                  <div className="avr-field avr-col-3">
                    <label className="avr-label">Logradouro</label>
                    <input className="avr-input" value={form.logradouro} onChange={(e) => setField("logradouro", e.target.value)} placeholder="Logradouro" />
                  </div>
                  <div className="avr-field avr-col-3">
                    <label className="avr-label">Complemento</label>
                    <input className="avr-input" value={form.complemento} onChange={(e) => setField("complemento", e.target.value)} placeholder="Complemento" />
                  </div>
                </div>

                <div className="avr-grid" style={{ marginTop: 16 }}>
                  <div className="avr-field avr-col-3">
                    <label className="avr-label">Bairro</label>
                    <input className="avr-input" value={form.bairro} onChange={(e) => setField("bairro", e.target.value)} placeholder="Bairro" />
                  </div>
                  <div className="avr-field avr-col-2" style={{ paddingTop: 22 }}>
                    <div className="avr-check-group">
                      <div className="avr-toggle-row">
                        <label className="avr-toggle"><input type="checkbox" checked={form.representante} onChange={(e) => setField("representante", e.target.checked)} /><div className="avr-toggle-track" /><div className="avr-toggle-thumb" /></label>
                        <span className="avr-toggle-label">Representante</span>
                      </div>
                    </div>
                  </div>
                  <div className="avr-field avr-col-2" style={{ paddingTop: 22 }}>
                    <div className="avr-check-group">
                      <div className="avr-toggle-row">
                        <label className="avr-toggle"><input type="checkbox" checked={form.cliente} onChange={(e) => setField("cliente", e.target.checked)} /><div className="avr-toggle-track" /><div className="avr-toggle-thumb" /></label>
                        <span className="avr-toggle-label">Cliente</span>
                      </div>
                    </div>
                  </div>
                </div>

                <div className="avr-section-sep" />
                <div className="avr-section-label">Documentos</div>
                <div className="avr-grid">
                  <div className="avr-field avr-col-2">
                    <label className="avr-label">Pessoa</label>
                    <select className="avr-select" value={form.pessoa} onChange={(e) => setField("pessoa", e.target.value)}>
                      {PESSOA_OPTS.map((p) => <option key={p} value={p}>{p}</option>)}
                    </select>
                  </div>
                  <div className="avr-field avr-col-3">
                    <label className="avr-label">CNPJ</label>
                    <input className="avr-input" value={form.cnpj} onChange={(e) => setField("cnpj", e.target.value)} placeholder="00.000.000/0000-00" disabled={pessoaFisica} />
                  </div>
                  <div className="avr-field avr-col-3">
                    <label className="avr-label">CPF</label>
                    <input className="avr-input" value={form.cpf} onChange={(e) => setField("cpf", e.target.value)} placeholder="000.000.000-00" disabled={!pessoaFisica} />
                  </div>
                  <div className="avr-field avr-col-2">
                    <label className="avr-label">Inscr. Est.</label>
                    <input className="avr-input" value={form.inscr_est} onChange={(e) => setField("inscr_est", e.target.value)} placeholder="IE" />
                  </div>
                  <div className="avr-field avr-col-2">
                    <label className="avr-label">Inscr. Mun.</label>
                    <input className="avr-input" value={form.inscr_mun} onChange={(e) => setField("inscr_mun", e.target.value)} placeholder="IM" />
                  </div>
                </div>

                <div className="avr-section-sep" />
                <div className="avr-section-label">Classificação</div>
                <div className="avr-grid">
                  <div className="avr-field avr-col-3">
                    <label className="avr-label">Tipo Frete</label>
                    <select className="avr-select" value={form.tipo_frete} onChange={(e) => setField("tipo_frete", e.target.value)}>
                      <option value="">Selecione...</option>
                      {TIPO_FRETE_OPTS.map((t) => <option key={t} value={t}>{t}</option>)}
                    </select>
                  </div>
                  <div className="avr-field avr-col-2">
                    <label className="avr-label">Dt. Cadastro</label>
                    <input type="date" className="avr-input" value={form.dt_cadastro} onChange={(e) => setField("dt_cadastro", e.target.value)} />
                  </div>
                  <div className="avr-field avr-col-2">
                    <label className="avr-label">Código Pai</label>
                    <select className="avr-select" value={form.codigo_pai} onChange={(e) => setField("codigo_pai", e.target.value)}>
                      <option value="">Nenhum</option>
                      {FORNECEDORES_MOCK.map((f) => <option key={f.code} value={f.code}>{f.code}</option>)}
                    </select>
                  </div>
                  <div className="avr-field avr-col-3">
                    <label className="avr-label">Tipo</label>
                    <select className="avr-select" value={form.tipo} onChange={(e) => setField("tipo", e.target.value)}>
                      {TIPO_OPTS.map((t) => <option key={t} value={t}>{t}</option>)}
                    </select>
                  </div>
                </div>

                <div className="avr-grid" style={{ marginTop: 16 }}>
                  <div className="avr-field avr-col-3">
                    <label className="avr-label">Obr. Vitícola</label>
                    <select className="avr-select" value={form.obr_viticola} onChange={(e) => setField("obr_viticola", e.target.value)}>
                      {OBR_VITICOLA_OPTS.map((o) => <option key={o} value={o}>{o}</option>)}
                    </select>
                  </div>
                  <div className="avr-field avr-col-2">
                    <label className="avr-label">Código GLN</label>
                    <input className="avr-input" value={form.codigo_gln} onChange={(e) => setField("codigo_gln", e.target.value)} placeholder="GLN" />
                  </div>
                  <div className="avr-field avr-col-2">
                    <label className="avr-label">Registro M.A.</label>
                    <input className="avr-input" value={form.registro_ma} onChange={(e) => setField("registro_ma", e.target.value)} placeholder="Registro" />
                  </div>
                  <div className="avr-field avr-col-3">
                    <label className="avr-label">Contrib. ICMS</label>
                    <select className="avr-select" value={form.contrib_icms} onChange={(e) => setField("contrib_icms", e.target.value)}>
                      <option value="">Selecione...</option>
                      {CONTRIB_ICMS_OPTS.map((c) => <option key={c} value={c}>{c}</option>)}
                    </select>
                  </div>
                </div>

                <div className="avr-grid" style={{ marginTop: 16 }}>
                  <div className="avr-field avr-col-3">
                    <label className="avr-label">MEI</label>
                    <div className="avr-toggle-row" style={{ paddingTop: 8 }}>
                      <label className={`avr-toggle${pessoaFisica ? " disabled" : ""}`}>
                        <input type="checkbox" checked={form.mei} disabled={pessoaFisica} onChange={(e) => setField("mei", e.target.checked)} />
                        <div className="avr-toggle-track" />
                        <div className="avr-toggle-thumb" />
                      </label>
                      <span className="avr-toggle-label" style={{ fontSize: 12, color: pessoaFisica ? "#8aaa94" : "#3a5a45" }}>
                        {form.mei ? "Sim" : "Não"}
                      </span>
                    </div>
                  </div>
                  <div className="avr-field avr-col-3">
                    <label className="avr-label">Plataforma de Rastreio</label>
                    <select className="avr-select" value={form.plataforma_rastreio} onChange={(e) => setField("plataforma_rastreio", e.target.value)}>
                      <option value="">Selecione...</option>
                      {PLATAFORMA_OPTS.map((p) => <option key={p} value={p}>{p}</option>)}
                    </select>
                  </div>
                </div>

                <div style={{ display: "flex", gap: 8, marginTop: 20, paddingTop: 16, borderTop: "1px solid #edf5e8" }}>
                  <button className="avr-btn avr-btn-ghost" type="button">
                    Verificar Últ. Consulta
                  </button>
                  <button className="avr-btn avr-btn-ghost" type="button">
                    Realizar Nova Consulta
                  </button>
                  <button className="avr-btn avr-btn-ghost" type="button">
                    Voltar ao Cadastro
                  </button>
                </div>
              </div>
            )}

            {/* ── ABA: TELEFONES ── */}
            {abaAtiva === "telefones" && (
              <div className="avr-tab-body">
                <div className="avr-section-label">Adicionar Telefone</div>
                <div className="avr-add-row">
                  <div className="avr-field" style={{ flex: "0 0 120px" }}>
                    <label className="avr-label">Tipo</label>
                    <select className="avr-select" value={novoTel.tipo} onChange={(e) => setNovoTel((p) => ({ ...p, tipo: e.target.value }))}>
                      <option value="">Tipo</option>
                      <option value="Celular">Celular</option>
                      <option value="Fixo">Fixo</option>
                      <option value="Comercial">Comercial</option>
                    </select>
                  </div>
                  <div className="avr-field" style={{ flex: "0 0 80px" }}>
                    <label className="avr-label">DDD</label>
                    <input className="avr-input" value={novoTel.ddd} onChange={(e) => setNovoTel((p) => ({ ...p, ddd: e.target.value }))} placeholder="11" />
                  </div>
                  <div className="avr-field" style={{ flex: "0 0 160px" }}>
                    <label className="avr-label">Número</label>
                    <input className="avr-input" value={novoTel.numero} onChange={(e) => setNovoTel((p) => ({ ...p, numero: e.target.value }))} placeholder="99999-9999" />
                  </div>
                  <div className="avr-field" style={{ flex: "0 0 160px" }}>
                    <label className="avr-label">Contato</label>
                    <input className="avr-input" value={novoTel.contato} onChange={(e) => setNovoTel((p) => ({ ...p, contato: e.target.value }))} placeholder="Nome" />
                  </div>
                  <button className="avr-btn avr-btn-primary" onClick={addTelefone} style={{ alignSelf: "flex-end" }}>Adicionar</button>
                </div>

                {telefones.length === 0 ? (
                  <div className="avr-table-empty">Nenhum telefone cadastrado.</div>
                ) : (
                  <table className="avr-table">
                    <thead>
                      <tr><th>Tipo</th><th>DDD</th><th>Número</th><th>Contato</th><th style={{ width: 60 }}></th></tr>
                    </thead>
                    <tbody>
                      {telefones.map((t, i) => (
                        <tr key={i}>
                          <td>{t.tipo}</td><td>{t.ddd}</td><td>{t.numero}</td><td>{t.contato}</td>
                          <td><button className="avr-remove-btn" onClick={() => removeTelefone(i)}>Remover</button></td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                )}
              </div>
            )}

            {/* ── ABA: E-MAILS ── */}
            {abaAtiva === "emails" && (
              <div className="avr-tab-body">
                <div className="avr-section-label">Adicionar E-mail</div>
                <div className="avr-add-row">
                  <div className="avr-field" style={{ flex: "0 0 120px" }}>
                    <label className="avr-label">Tipo</label>
                    <select className="avr-select" value={novoEmail.tipo} onChange={(e) => setNovoEmail((p) => ({ ...p, tipo: e.target.value }))}>
                      <option value="">Tipo</option>
                      <option value="Comercial">Comercial</option>
                      <option value="Financeiro">Financeiro</option>
                      <option value="NFe">NFe</option>
                    </select>
                  </div>
                  <div className="avr-field" style={{ flex: "0 0 280px" }}>
                    <label className="avr-label">E-mail</label>
                    <input className="avr-input" value={novoEmail.email} onChange={(e) => setNovoEmail((p) => ({ ...p, email: e.target.value }))} placeholder="email@exemplo.com" />
                  </div>
                  <div className="avr-field" style={{ flex: "0 0 160px" }}>
                    <label className="avr-label">Contato</label>
                    <input className="avr-input" value={novoEmail.contato} onChange={(e) => setNovoEmail((p) => ({ ...p, contato: e.target.value }))} placeholder="Nome" />
                  </div>
                  <button className="avr-btn avr-btn-primary" onClick={addEmail} style={{ alignSelf: "flex-end" }}>Adicionar</button>
                </div>

                {emails.length === 0 ? (
                  <div className="avr-table-empty">Nenhum e-mail cadastrado.</div>
                ) : (
                  <table className="avr-table">
                    <thead>
                      <tr><th>Tipo</th><th>E-mail</th><th>Contato</th><th style={{ width: 60 }}></th></tr>
                    </thead>
                    <tbody>
                      {emails.map((e, i) => (
                        <tr key={i}>
                          <td>{e.tipo}</td><td>{e.email}</td><td>{e.contato}</td>
                          <td><button className="avr-remove-btn" onClick={() => removeEmail(i)}>Remover</button></td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                )}
              </div>
            )}

            {/* ── ABA: TRANSPORTE ── */}
            {abaAtiva === "transporte" && (
              <div className="avr-tab-body">
                <div className="avr-section-label">Adicionar Transporte</div>
                <div className="avr-add-row">
                  <div className="avr-field" style={{ flex: "0 0 140px" }}>
                    <label className="avr-label">Placa</label>
                    <input className="avr-input" value={novoTransp.placa} onChange={(e) => setNovoTransp((p) => ({ ...p, placa: e.target.value }))} placeholder="ABC-1234" />
                  </div>
                  <div className="avr-field" style={{ flex: "0 0 80px" }}>
                    <label className="avr-label">UF</label>
                    <select className="avr-select" value={novoTransp.uf} onChange={(e) => setNovoTransp((p) => ({ ...p, uf: e.target.value }))}>
                      <option value="">UF</option>
                      {UFS_MOCK.map((u) => <option key={u} value={u}>{u}</option>)}
                    </select>
                  </div>
                  <div className="avr-field" style={{ flex: "0 0 160px" }}>
                    <label className="avr-label">Tipo</label>
                    <select className="avr-select" value={novoTransp.tipo} onChange={(e) => setNovoTransp((p) => ({ ...p, tipo: e.target.value }))}>
                      <option value="">Tipo</option>
                      <option value="Próprio">Próprio</option>
                      <option value="Terceiro">Terceiro</option>
                    </select>
                  </div>
                  <button className="avr-btn avr-btn-primary" onClick={addTransporte} style={{ alignSelf: "flex-end" }}>Adicionar</button>
                </div>

                {transportes.length === 0 ? (
                  <div className="avr-table-empty">Nenhum transporte cadastrado.</div>
                ) : (
                  <table className="avr-table">
                    <thead>
                      <tr><th>Placa</th><th>UF</th><th>Tipo</th><th style={{ width: 60 }}></th></tr>
                    </thead>
                    <tbody>
                      {transportes.map((t, i) => (
                        <tr key={i}>
                          <td>{t.placa}</td><td>{t.uf}</td><td>{t.tipo}</td>
                          <td><button className="avr-remove-btn" onClick={() => removeTransporte(i)}>Remover</button></td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                )}
              </div>
            )}

            {/* ── ABA: INFORMAÇÕES DO PROCESSO ── */}
            {abaAtiva === "processo" && (
              <div className="avr-tab-body">
                <div className="avr-section-label">Informações do Processo</div>
                <div className="avr-grid">
                  <div className="avr-field avr-col-6">
                    <label className="avr-label">Observações</label>
                    <textarea className="avr-input" style={{ height: 80, padding: "8px 10px", resize: "vertical" }} placeholder="Observações sobre o processo..." />
                  </div>
                  <div className="avr-field avr-col-6">
                    <label className="avr-label">Histórico</label>
                    <div style={{ background: "#f8fbf6", border: "1.5px solid #d4e8cc", borderRadius: 7, padding: "10px 14px", fontSize: 12, color: "#6a8a74", minHeight: 80 }}>
                      Nenhum histórico registrado.
                    </div>
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>

        {/* ── FOOTER ── */}
        <footer className="avr-footer">
          <div className="avr-footer-left">
            <div className="avr-footer-stat">Tel: <strong>{telefones.length}</strong></div>
            <div className="avr-footer-stat">E-mails: <strong>{emails.length}</strong></div>
            <div className="avr-footer-stat">Transp: <strong>{transportes.length}</strong></div>
            <div className="avr-footer-stat">Módulo: <strong>Suprimento</strong></div>
          </div>
          <div className="avr-footer-stat" style={{ gap: 8 }}>
            <span style={{ color: "#b0c8b8", fontSize: 11 }}>GRUPO VENTURE LTDA</span>
          </div>
        </footer>
      </div>
    </>
  );
}

// ─── Mock usado na aba de Dados Gerais ──────────────────────────────────────
const FORNECEDORES_MOCK = [{ code: "001" }, { code: "002" }, { code: "003" }];
