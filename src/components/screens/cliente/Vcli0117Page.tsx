import { useState, useCallback } from "react";
import { type PermissaoVendaResponse } from "@/services/permissaoVendaService";

// ─── Constants ────────────────────────────────────────────────────────────────

const TIPOS_PERMISSAO = ["Permissão", "Restrição"] as const;

// ─── Types ────────────────────────────────────────────────────────────────────

type AbaAtiva = "itens" | "classificacao";
type ModoForm = "novo" | "edicao";

type FeedbackState = {
  type: "success" | "error" | "info";
  message: string;
} | null;

interface FormPermissao {
  cliente: string;
  estab_faturamento: string;
  representante: string;
}

interface LinhaItem {
  id: number;
  item: string;
  permissao: "Permissão" | "Restrição";
}

interface LinhaClassificacao {
  id: number;
  classificacao: string;
  permissao: "Permissão" | "Restrição";
}

const FORM_INICIAL: FormPermissao = {
  cliente: "",
  estab_faturamento: "",
  representante: "",
};

const MOCK_ITENS = [
  "001 – CADEIRA GIRATÓRIA",
  "002 – MESA DE ESCRITÓRIO",
  "003 – ARMÁRIO 2 PORTAS",
  "004 – ESTANTE METÁLICA",
  "005 – SOFÁ 3 LUGARES",
];

const MOCK_CLASSIFICACOES = [
  "A – MOVELEIRO",
  "B – DECORADOR",
  "C – LOJISTA",
  "D – ATACADISTA",
  "E – E-COMMERCE",
];

const MOCK_CLIENTES = [
  "001 – SOHOME LTDA",
  "002 – ALFA S.A.",
  "003 – BETA LTDA",
  "004 – GAMA ME",
];

const MOCK_REPRESENTANTES = [
  "001 – JOÃO SILVA",
  "002 – MARIA SOUZA",
  "003 – PEDRO COSTA",
];

// ─── Helpers ──────────────────────────────────────────────────────────────────

function normalizeErrorMessage(error: unknown, fallback: string): string {
  if (error && typeof error === "object" && "response" in error) {
    const resp = (error as any).response;
    if (resp?.data?.message) return String(resp.data.message);
  }
  if (error instanceof Error) return error.message;
  return fallback;
}

let _nextId = 100;

function nextId(): number {
  return ++_nextId;
}

// ─── Component ────────────────────────────────────────────────────────────────

export function Vcli0117Page(): JSX.Element {
  // ── Form state
  const [form, setForm] = useState<FormPermissao>(FORM_INICIAL);
  const [modoForm, setModoForm] = useState<ModoForm>("novo");
  const [idEdicao, setIdEdicao] = useState<string | null>(null);
  const [abaAtiva, setAbaAtiva] = useState<AbaAtiva>("itens");
  const [itens, setItens] = useState<LinhaItem[]>([]);
  const [classificacoes, setClassificacoes] = useState<LinhaClassificacao[]>([]);

  // ── Search state
  const [filtroCliente, setFiltroCliente] = useState("");
  const [filtroEstab, setFiltroEstab] = useState("");
  const [filtroRepresentante, setFiltroRepresentante] = useState("");
  const [resultados, setResultados] = useState<PermissaoVendaResponse[]>([]);
  const [mostrarResultados, setMostrarResultados] = useState(false);

  // ── Loading / feedback
  const [isSaving, setIsSaving] = useState(false);
  const [isSearching, setIsSearching] = useState(false);
  const [feedback, setFeedback] = useState<FeedbackState>(null);

  // ── Field setter
  const setField = useCallback(
    <K extends keyof FormPermissao>(key: K, value: FormPermissao[K]) => {
      setForm((prev) => ({ ...prev, [key]: value }));
      setFeedback(null);
    },
    [],
  );

  // ── Validation
  function validate(): boolean {
    if (!form.cliente.trim()) {
      setFeedback({ type: "error", message: "Cliente é obrigatório." });
      return false;
    }
    if (!form.estab_faturamento.trim()) {
      setFeedback({ type: "error", message: "Estabelecimento de faturamento é obrigatório." });
      return false;
    }
    if (!form.representante.trim()) {
      setFeedback({ type: "error", message: "Representante é obrigatório." });
      return false;
    }
    return true;
  }

  // ── Item handlers
  function handleAddItem() {
    setItens((prev) => [...prev, { id: nextId(), item: "", permissao: "Permissão" }]);
  }

  function handleRemoveItem(id: number) {
    setItens((prev) => prev.filter((r) => r.id !== id));
  }

  function handleItemChange(id: number, field: keyof LinhaItem, value: string) {
    setItens((prev) =>
      prev.map((r) =>
        r.id === id ? { ...r, [field]: field === "permissao" ? (value as "Permissão" | "Restrição") : value } : r,
      ),
    );
  }

  // ── Classificação handlers
  function handleAddClassificacao() {
    setClassificacoes((prev) => [...prev, { id: nextId(), classificacao: "", permissao: "Permissão" }]);
  }

  function handleRemoveClassificacao(id: number) {
    setClassificacoes((prev) => prev.filter((r) => r.id !== id));
  }

  function handleClassificacaoChange(id: number, field: keyof LinhaClassificacao, value: string) {
    setClassificacoes((prev) =>
      prev.map((r) =>
        r.id === id ? { ...r, [field]: field === "permissao" ? (value as "Permissão" | "Restrição") : value } : r,
      ),
    );
  }

  // ── Pesquisar
  async function handlePesquisar() {
    setIsSearching(true);
    setFeedback(null);
    try {
      await new Promise((r) => setTimeout(r, 600));
      const mockResults: PermissaoVendaResponse[] = [
        { cliente: "001", estab_faturamento: "001", representante: "001", cliente_nome: "SOHOME LTDA", estab_faturamento_nome: "MATRIZ", representante_nome: "JOÃO SILVA" },
        { cliente: "002", estab_faturamento: "001", representante: "002", cliente_nome: "ALFA S.A.", estab_faturamento_nome: "FILIAL SP", representante_nome: "MARIA SOUZA" },
        { cliente: "003", estab_faturamento: "002", representante: "003", cliente_nome: "BETA LTDA", estab_faturamento_nome: "MATRIZ", representante_nome: "PEDRO COSTA" },
      ];
      const filtered = mockResults.filter((r) => {
        if (filtroCliente && !r.cliente_nome.toLowerCase().includes(filtroCliente.toLowerCase()) && r.cliente !== filtroCliente) return false;
        if (filtroEstab && !r.estab_faturamento_nome.toLowerCase().includes(filtroEstab.toLowerCase()) && r.estab_faturamento !== filtroEstab) return false;
        if (filtroRepresentante && !r.representante_nome.toLowerCase().includes(filtroRepresentante.toLowerCase()) && r.representante !== filtroRepresentante) return false;
        return true;
      });
      setResultados(filtered);
      setMostrarResultados(true);
      if (filtered.length === 0) {
        setFeedback({ type: "info", message: "Nenhum registro encontrado para os filtros informados." });
      }
    } catch (error) {
      setFeedback({ type: "error", message: normalizeErrorMessage(error, "Erro ao pesquisar.") });
    } finally {
      setIsSearching(false);
    }
  }

  // ── Select from list
  function handleSelectFromList(r: PermissaoVendaResponse) {
    setForm({
      cliente: r.cliente,
      estab_faturamento: r.estab_faturamento,
      representante: r.representante,
    });
    setItens([
      { id: nextId(), item: "001 – CADEIRA GIRATÓRIA", permissao: "Permissão" },
      { id: nextId(), item: "002 – MESA DE ESCRITÓRIO", permissao: "Restrição" },
    ]);
    setClassificacoes([
      { id: nextId(), classificacao: "A – MOVELEIRO", permissao: "Permissão" },
    ]);
    setFeedback(null);
    setAbaAtiva("itens");
    setModoForm("edicao");
    setIdEdicao(r.cliente);
    window.scrollTo({ top: document.body.scrollHeight, behavior: "smooth" });
  }

  // ── Save
  async function handleSalvar() {
    if (!validate()) return;
    setIsSaving(true);
    setFeedback(null);
    try {
      await new Promise((r) => setTimeout(r, 800));
      setFeedback({
        type: "success",
        message: `Permissão para cliente ${form.cliente} salva com sucesso.`,
      });
    } catch (error) {
      setFeedback({ type: "error", message: normalizeErrorMessage(error, "Erro ao salvar.") });
    } finally {
      setIsSaving(false);
    }
  }

  // ── Novo
  function handleNovo() {
    setForm(FORM_INICIAL);
    setItens([]);
    setClassificacoes([]);
    setFeedback(null);
    setAbaAtiva("itens");
    setModoForm("novo");
    setIdEdicao(null);
  }

  function handleLimpar() {
    handleNovo();
    setMostrarResultados(false);
  }

  const ABAS: { id: AbaAtiva; label: string }[] = [
    { id: "itens", label: `Itens${itens.length > 0 ? ` (${itens.length})` : ""}` },
    { id: "classificacao", label: `Classificação${classificacoes.length > 0 ? ` (${classificacoes.length})` : ""}` },
  ];

  // ─── JSX ──────────────────────────────────────────────────────────────────

  return (
    <>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Inter:wght@300;400;500;600&display=swap');
        *, *::before, *::after { box-sizing: border-box; margin: 0; padding: 0; }

        .cli-root {
          min-height: 100vh; background: #f0f4ee;
          font-family: 'Inter', sans-serif; color: #1a2e22;
          display: flex; flex-direction: column;
        }

        .cli-topbar {
          height: 52px; background: #162e20;
          display: flex; align-items: center; justify-content: space-between;
          padding: 0 20px; flex-shrink: 0;
          border-bottom: 1px solid rgba(62,150,84,0.15);
        }
        .cli-topbar-left { display: flex; align-items: center; gap: 10px; }
        .cli-logo-mark {
          width: 28px; height: 28px; background: #3e9654;
          border-radius: 6px; display: flex; align-items: center; justify-content: center;
        }
        .cli-app-name { font-size: 13px; font-weight: 600; color: #e0f0e3; line-height: 1.1; }
        .cli-app-sub  { display: block; font-size: 9px; font-weight: 400; color: #3d6b4d; }
        .cli-screen-title {
          font-size: 12.5px; font-weight: 500; color: #5a9a6a;
          padding-left: 14px; margin-left: 14px;
          border-left: 1px solid rgba(255,255,255,0.08);
        }

        .cli-actionbar {
          background: #fff; border-bottom: 1px solid #dbe8d5;
          padding: 0 20px; display: flex; align-items: center;
          gap: 4px; height: 46px; flex-shrink: 0;
        }
        .cli-action-group {
          display: flex; align-items: center; gap: 4px;
          padding-right: 12px; margin-right: 8px;
          border-right: 1px solid #e8f0e4;
        }
        .cli-action-group:last-child { border-right: none; }
        .cli-action-label {
          font-size: 9.5px; font-weight: 600; letter-spacing: 0.8px;
          text-transform: uppercase; color: #96b8a0; margin-right: 4px; white-space: nowrap;
        }
        .cli-btn {
          display: inline-flex; align-items: center; gap: 6px;
          height: 32px; padding: 0 12px; border: 1.5px solid transparent;
          border-radius: 7px; font-family: 'Inter', sans-serif;
          font-size: 12.5px; font-weight: 500; cursor: pointer; white-space: nowrap;
          transition: background 0.13s, border-color 0.13s, color 0.13s;
        }
        .cli-btn-primary { background: #162e20; color: #dff0e2; border-color: #162e20; }
        .cli-btn-primary:hover:not(:disabled) { background: #1e3a2a; }
        .cli-btn-primary:disabled { opacity: 0.5; cursor: not-allowed; }
        .cli-btn-ghost { background: transparent; color: #4a7060; border-color: #d4e8d0; }
        .cli-btn-ghost:hover:not(:disabled) { background: #f0f8ec; border-color: #b0d4b8; color: #1a3828; }
        .cli-btn-ghost:disabled { opacity: 0.5; cursor: not-allowed; }
        .cli-btn-danger { background: transparent; color: #b94040; border-color: #f0c8c8; }
        .cli-btn-danger:hover:not(:disabled) { background: #fff0f0; border-color: #e09090; }
        .cli-btn-sm { height: 28px; padding: 0 9px; font-size: 12px; }
        .cli-btn-new {
          background: #eef9f0; color: #1a6030; border-color: #b4d8b8; font-weight: 600;
        }
        .cli-btn-new:hover:not(:disabled) { background: #dff5e4; border-color: #88c898; }

        .cli-body {
          flex: 1; padding: 16px 20px; display: flex;
          flex-direction: column; gap: 0; overflow-y: auto;
        }
        .cli-body::-webkit-scrollbar { width: 5px; }
        .cli-body::-webkit-scrollbar-thumb { background: #cce0c8; border-radius: 4px; }

        .cli-section-banner {
          display: flex; align-items: center; gap: 10px;
          padding: 14px 0 8px;
        }
        .cli-section-banner:first-child { padding-top: 0; }
        .cli-section-banner-pill {
          font-size: 9.5px; font-weight: 700; letter-spacing: 1.2px;
          text-transform: uppercase; color: #5a8068;
          background: #e0ede0; border: 1px solid #c8dcc8;
          border-radius: 20px; padding: 3px 10px; white-space: nowrap;
        }
        .cli-section-banner-line { flex: 1; height: 1px; background: #dbe8d5; }
        .cli-section-banner-hint { font-size: 11px; color: #96b8a0; white-space: nowrap; }

        .cli-card {
          background: #fff; border: 1px solid #dbe8d5;
          border-radius: 12px; overflow: hidden; margin-bottom: 14px;
        }
        .cli-card-header {
          display: flex; align-items: center; justify-content: space-between;
          padding: 12px 18px; border-bottom: 1px solid #edf5e8; background: #fafcf9;
        }
        .cli-card-header-left { display: flex; align-items: center; gap: 8px; }
        .cli-card-title { font-size: 12px; font-weight: 600; color: #2a4a35; text-transform: uppercase; letter-spacing: 0.6px; }
        .cli-card-badge {
          font-size: 10.5px; font-weight: 500; color: #3e9654;
          background: #eef5ea; border: 1px solid #c4dfc8; border-radius: 12px; padding: 2px 8px;
        }
        .cli-card-body { padding: 18px 18px; }

        .cli-modo-novo {
          display: inline-flex; align-items: center; gap: 5px;
          font-size: 11px; font-weight: 600; padding: 3px 10px;
          border-radius: 20px; background: #e8f5e0; color: #1e5818;
          border: 1px solid #a8d898;
        }
        .cli-modo-edicao {
          display: inline-flex; align-items: center; gap: 5px;
          font-size: 11px; font-weight: 600; padding: 3px 10px;
          border-radius: 20px; background: #fff8e0; color: #7a5200;
          border: 1px solid #e0c860;
        }
        .cli-modo-dot {
          width: 6px; height: 6px; border-radius: 50%; flex-shrink: 0;
        }
        .cli-modo-novo  .cli-modo-dot { background: #3e9654; }
        .cli-modo-edicao .cli-modo-dot { background: #c8a020; }

        .cli-filter-row { display: flex; align-items: flex-end; gap: 12px; flex-wrap: wrap; }

        .cli-grid { display: grid; grid-template-columns: repeat(12, 1fr); gap: 16px 14px; align-items: start; }
        .cli-col-2  { grid-column: span 2; }
        .cli-col-3  { grid-column: span 3; }
        .cli-col-4  { grid-column: span 4; }
        .cli-col-5  { grid-column: span 5; }
        .cli-col-6  { grid-column: span 6; }
        .cli-col-8  { grid-column: span 8; }
        .cli-col-12 { grid-column: span 12; }

        .cli-field { display: flex; flex-direction: column; gap: 5px; }
        .cli-label {
          font-size: 10.5px; font-weight: 600; color: #5a8068;
          text-transform: uppercase; letter-spacing: 0.4px;
          display: flex; align-items: center; gap: 4px;
        }
        .cli-label-req { color: #c84040; font-size: 12px; line-height: 1; }
        .cli-input {
          width: 100%; height: 36px; background: #f8fbf6;
          border: 1.5px solid #d4e8cc; border-radius: 7px;
          padding: 0 10px; font-family: 'Inter', sans-serif;
          font-size: 13px; color: #1a2e22; outline: none;
          transition: border-color 0.13s, box-shadow 0.13s;
        }
        .cli-input:focus { border-color: #3e9654; box-shadow: 0 0 0 2px rgba(62,150,84,0.1); }
        .cli-input::placeholder { color: #b0c8b8; font-size: 12px; }
        .cli-input:disabled { background: #f0f4ee; color: #8aaa94; cursor: not-allowed; border-color: #e0ead8; }

        .cli-select {
          width: 100%; height: 36px; background: #f8fbf6;
          border: 1.5px solid #d4e8cc; border-radius: 7px;
          padding: 0 28px 0 10px; font-family: 'Inter', sans-serif;
          font-size: 13px; color: #1a2e22; outline: none;
          appearance: none; cursor: pointer;
          background-image: url("data:image/svg+xml,%3Csvg width='10' height='6' viewBox='0 0 10 6' xmlns='http://www.w3.org/2000/svg'%3E%3Cpath d='M1 1l4 4 4-4' stroke='%23789a84' stroke-width='1.5' fill='none' stroke-linecap='round' stroke-linejoin='round'/%3E%3C/svg%3E");
          background-repeat: no-repeat; background-position: right 10px center;
          transition: border-color 0.13s;
        }
        .cli-select:focus { border-color: #3e9654; box-shadow: 0 0 0 2px rgba(62,150,84,0.1); }

        .cli-field-hint { font-size: 11px; color: #7a9c84; margin-top: 2px; line-height: 1.45; }

        .cli-tabs {
          display: flex; align-items: flex-end; gap: 0;
          border-bottom: 2px solid #dbe8d5; background: #fafcf9;
        }
        .cli-tab {
          padding: 10px 20px; font-size: 12.5px; font-weight: 500;
          color: #6a8a74; cursor: pointer; border: none; background: transparent;
          border-bottom: 2px solid transparent; margin-bottom: -2px;
          transition: color 0.13s, border-color 0.13s; white-space: nowrap;
          font-family: 'Inter', sans-serif;
        }
        .cli-tab:hover { color: #2a4a35; }
        .cli-tab.active { color: #162e20; border-bottom-color: #3e9654; font-weight: 600; }
        .cli-tab-body { padding: 20px 18px; }

        .cli-results-wrap { border-top: 1px solid #edf5e8; overflow-x: auto; }
        .cli-results-bar {
          display: flex; align-items: center; justify-content: space-between;
          padding: 10px 18px; background: #f4f9f2; border-bottom: 1px solid #e8f0e4;
        }
        .cli-results-bar-left { display: flex; align-items: center; gap: 8px; }
        .cli-results-bar-label { font-size: 11px; font-weight: 600; color: #4a7060; text-transform: uppercase; letter-spacing: 0.5px; }
        .cli-results-hint { font-size: 11px; color: #96b8a0; }
        .cli-results-table { width: 100%; border-collapse: collapse; font-size: 13px; }
        .cli-results-table th {
          background: #f4f9f2; padding: 8px 12px; text-align: left;
          font-size: 10.5px; font-weight: 700; color: #5a8068;
          text-transform: uppercase; letter-spacing: 0.5px;
          border-bottom: 1.5px solid #dbe8d5; white-space: nowrap;
        }
        .cli-results-table td { padding: 9px 12px; border-bottom: 1px solid #f0f6ec; color: #243830; vertical-align: middle; }
        .cli-results-table tbody tr { cursor: pointer; transition: background 0.1s; }
        .cli-results-table tbody tr:hover { background: #eef9f0; }
        .cli-results-empty { text-align: center; padding: 28px 12px; color: #96b8a0; font-size: 12.5px; }

        .cli-grid-table { width: 100%; border-collapse: collapse; font-size: 13px; }
        .cli-grid-table th {
          background: #f4f9f2; padding: 8px 12px; text-align: left;
          font-size: 10.5px; font-weight: 700; color: #5a8068;
          text-transform: uppercase; letter-spacing: 0.5px;
          border-bottom: 1.5px solid #dbe8d5;
        }
        .cli-grid-table td { padding: 8px 10px; border-bottom: 1px solid #f0f6ec; color: #243830; vertical-align: middle; }
        .cli-grid-table tbody tr:hover { background: #f4fbf2; }
        .cli-grid-empty { text-align: center; padding: 28px 12px; color: #96b8a0; font-size: 12.5px; }
        .cli-remove-btn {
          background: transparent; border: none; cursor: pointer; color: #c89090;
          padding: 3px 6px; border-radius: 5px; font-size: 12px; font-family: 'Inter', sans-serif;
          transition: background 0.12s, color 0.12s;
        }
        .cli-remove-btn:hover { background: #fdecea; color: #b94040; }
        .cli-add-row { display: flex; align-items: center; gap: 6px; margin-top: 12px; }

        .cli-feedback {
          display: flex; align-items: center; gap: 9px; padding: 11px 15px;
          border-radius: 9px; font-size: 13px; animation: cliFadeIn 0.2s ease;
          margin-bottom: 14px;
        }
        .cli-feedback.success { background: #f0faf2; border: 1px solid #b4dec0; color: #1e6030; }
        .cli-feedback.error   { background: #fff5f5; border: 1px solid #f8c0c0; border-left: 3px solid #e05252; color: #b91c1c; }
        .cli-feedback.info    { background: #f0f8ff; border: 1px solid #c7def8; border-left: 3px solid #4a90d9; color: #1a4070; }

        .cli-permissao-badge {
          display: inline-flex; align-items: center;
          font-size: 11px; font-weight: 600; border-radius: 12px; padding: 2px 8px;
        }
        .cli-permissao-badge.permissao { background: #e8f5e0; color: #2a6018; border: 1px solid #b4d898; }
        .cli-permissao-badge.restricao { background: #fdecea; color: #a02020; border: 1px solid #e8a0a0; }

        .cli-footer {
          background: #fff; border-top: 1px solid #dbe8d5;
          padding: 8px 20px; display: flex; align-items: center;
          justify-content: space-between; flex-shrink: 0;
        }
        .cli-footer-left { display: flex; align-items: center; gap: 20px; }
        .cli-footer-stat { display: flex; align-items: center; gap: 6px; font-size: 11.5px; color: #6a8a74; }
        .cli-footer-stat strong { color: #1a2e22; font-weight: 600; }

        @keyframes spin { to { transform: rotate(360deg); } }
        .cli-spinner {
          width: 14px; height: 14px; flex-shrink: 0;
          border: 2px solid rgba(223,240,226,0.3); border-top-color: #dff0e2;
          border-radius: 50%; animation: spin 0.65s linear infinite;
        }
        .cli-spinner-dark {
          width: 14px; height: 14px; flex-shrink: 0;
          border: 2px solid #d4e8cc; border-top-color: #3e9654;
          border-radius: 50%; animation: spin 0.65s linear infinite;
        }
        @keyframes cliFadeIn { from { opacity: 0; transform: translateY(-4px); } to { opacity: 1; transform: translateY(0); } }
      `}</style>

      <div className="cli-root">

        {/* TOPBAR */}
        <header className="cli-topbar">
          <div className="cli-topbar-left">
            <div className="cli-logo-mark">
              <svg width="15" height="15" viewBox="0 0 18 18" fill="none">
                <rect x="1.5" y="1.5" width="6" height="6" rx="1.2" fill="rgba(255,255,255,0.9)" />
                <rect x="10.5" y="1.5" width="6" height="6" rx="1.2" fill="rgba(255,255,255,0.4)" />
                <rect x="1.5" y="10.5" width="6" height="6" rx="1.2" fill="rgba(255,255,255,0.4)" />
                <rect x="10.5" y="10.5" width="6" height="6" rx="1.2" fill="rgba(255,255,255,0.7)" />
              </svg>
            </div>
            <span className="cli-app-name">
              Venture<span className="cli-app-sub">ERP &amp; Soluções</span>
            </span>
            <span className="cli-screen-title">VCLI0117 — Cadastro de Permissões e Restrições de Venda</span>
          </div>
        </header>

        {/* ACTION BAR */}
        <div className="cli-actionbar">
          <div className="cli-action-group">
            <span className="cli-action-label">Cadastro</span>
            <button className="cli-btn cli-btn-new" onClick={handleNovo} disabled={isSaving || isSearching}>
              <svg width="12" height="12" viewBox="0 0 12 12" fill="none">
                <path d="M6 2v8M2 6h8" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" />
              </svg>
              Nova Permissão
            </button>
          </div>
          <div className="cli-action-group">
            <span className="cli-action-label">Ações</span>
            <button className="cli-btn cli-btn-primary" onClick={() => void handleSalvar()} disabled={isSaving || isSearching}>
              {isSaving
                ? <><div className="cli-spinner" />Salvando...</>
                : <>
                    <svg width="13" height="13" viewBox="0 0 16 16" fill="none">
                      <path d="M2 2h9l3 3v9a1 1 0 01-1 1H3a1 1 0 01-1-1V3a1 1 0 011-1z" stroke="currentColor" strokeWidth="1.4" strokeLinejoin="round" />
                      <path d="M5 2v4h6V2M5 9h6" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" />
                    </svg>
                    Salvar
                  </>
              }
            </button>
            <button className="cli-btn cli-btn-danger" onClick={handleLimpar} disabled={isSaving || isSearching}>
              <svg width="13" height="13" viewBox="0 0 16 16" fill="none">
                <path d="M3 3l10 10M13 3L3 13" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
              </svg>
              Limpar
            </button>
          </div>
          <div className="cli-action-group">
            <button className="cli-btn cli-btn-ghost">
              <svg width="13" height="13" viewBox="0 0 16 16" fill="none">
                <circle cx="8" cy="8" r="6" stroke="currentColor" strokeWidth="1.4" />
                <path d="M8 7v4M8 5.5h.01" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" />
              </svg>
              Ajuda
            </button>
          </div>
        </div>

        {/* BODY */}
        <div className="cli-body">

          {/* Feedback */}
          {feedback && (
            <div className={`cli-feedback ${feedback.type}`}>
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
          <div className="cli-section-banner">
            <span className="cli-section-banner-pill">1 — Pesquisar</span>
            <div className="cli-section-banner-line" />
            <span className="cli-section-banner-hint">Filtre e clique em um registro para carregá-lo no formulário abaixo</span>
          </div>

          <div className="cli-card">
            <div className="cli-card-header">
              <div className="cli-card-header-left">
                <svg width="14" height="14" viewBox="0 0 16 16" fill="none">
                  <circle cx="6.5" cy="6.5" r="4.5" stroke="#3e9654" strokeWidth="1.4" />
                  <path d="M10 10l3.5 3.5" stroke="#3e9654" strokeWidth="1.4" strokeLinecap="round" />
                </svg>
                <span className="cli-card-title">Pesquisa de Permissões de Venda</span>
              </div>
            </div>
            <div className="cli-card-body" style={{ paddingBottom: 14 }}>
              <div className="cli-filter-row">
                <div className="cli-field" style={{ flex: "0 0 220px" }}>
                  <label className="cli-label">Cliente</label>
                  <select className="cli-select" value={filtroCliente} onChange={(e) => setFiltroCliente(e.target.value)}>
                    <option value="">Todos</option>
                    {MOCK_CLIENTES.map((c) => <option key={c} value={c}>{c}</option>)}
                  </select>
                </div>
                <div className="cli-field" style={{ flex: "0 0 220px" }}>
                  <label className="cli-label">Estab. Faturamento</label>
                  <input className="cli-input" placeholder="Código ou nome" value={filtroEstab} onChange={(e) => setFiltroEstab(e.target.value)} onKeyDown={(e) => e.key === "Enter" && void handlePesquisar()} />
                </div>
                <div className="cli-field" style={{ flex: "0 0 220px" }}>
                  <label className="cli-label">Representante</label>
                  <select className="cli-select" value={filtroRepresentante} onChange={(e) => setFiltroRepresentante(e.target.value)}>
                    <option value="">Todos</option>
                    {MOCK_REPRESENTANTES.map((r) => <option key={r} value={r}>{r}</option>)}
                  </select>
                </div>
                <div style={{ alignSelf: "flex-end" }}>
                  <button className="cli-btn cli-btn-ghost" onClick={() => void handlePesquisar()} disabled={isSearching}>
                    {isSearching
                      ? <><div className="cli-spinner-dark" />Buscando...</>
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
              <div className="cli-results-wrap">
                <div className="cli-results-bar">
                  <div className="cli-results-bar-left">
                    <svg width="13" height="13" viewBox="0 0 16 16" fill="none">
                      <path d="M2 4h12M2 8h12M2 12h8" stroke="#5a8068" strokeWidth="1.4" strokeLinecap="round" />
                    </svg>
                    <span className="cli-results-bar-label">Resultados</span>
                    <span className="cli-card-badge">{resultados.length} registro(s)</span>
                  </div>
                  <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                    <span className="cli-results-hint">Clique em um registro para editar</span>
                    <button className="cli-btn cli-btn-ghost cli-btn-sm" onClick={() => setMostrarResultados(false)}>Fechar</button>
                  </div>
                </div>
                {resultados.length === 0 ? (
                  <div className="cli-results-empty">Nenhum registro encontrado para os filtros informados.</div>
                ) : (
                  <table className="cli-results-table">
                    <thead>
                      <tr>
                        <th style={{ width: 80 }}>Cliente</th>
                        <th>Nome Cliente</th>
                        <th style={{ width: 120 }}>Est. Faturamento</th>
                        <th>Representante</th>
                      </tr>
                    </thead>
                    <tbody>
                      {resultados.map((r, i) => (
                        <tr key={i} onClick={() => handleSelectFromList(r)}>
                          <td style={{ fontWeight: 600, color: "#1a4a2a" }}>{r.cliente}</td>
                          <td>{r.cliente_nome}</td>
                          <td>{r.estab_faturamento_nome}</td>
                          <td>{r.representante_nome}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                )}
              </div>
            )}
          </div>

          {/* SEÇÃO 2 — CRIAR / EDITAR */}
          <div className="cli-section-banner">
            <span className="cli-section-banner-pill">2 — Criar / Editar</span>
            <div className="cli-section-banner-line" />
            <span className="cli-section-banner-hint">
              {modoForm === "novo"
                ? "Preencha os campos e clique em Salvar para criar uma nova permissão"
                : `Editando permissão do cliente ${idEdicao ?? "?"} — clique em Nova Permissão para cancelar`}
            </span>
          </div>

          <div className="cli-card">
            <div className="cli-card-header">
              <div className="cli-card-header-left">
                <svg width="14" height="14" viewBox="0 0 16 16" fill="none">
                  <path d="M2 2h9l3 3v9a1 1 0 01-1 1H3a1 1 0 01-1-1V3a1 1 0 011-1z" stroke="#3e9654" strokeWidth="1.4" strokeLinejoin="round" />
                  <path d="M5 2v4h6V2M5 9h6" stroke="#3e9654" strokeWidth="1.4" strokeLinecap="round" />
                </svg>
                <span className="cli-card-title">Permissão de Venda</span>
              </div>
              {modoForm === "novo"
                ? <span className="cli-modo-novo"><span className="cli-modo-dot" />Nova Permissão</span>
                : <span className="cli-modo-edicao"><span className="cli-modo-dot" />Editando {idEdicao}</span>
              }
            </div>

            {/* TABS */}
            <div className="cli-tabs">
              {ABAS.map((aba) => (
                <button
                  key={aba.id}
                  className={`cli-tab${abaAtiva === aba.id ? " active" : ""}`}
                  onClick={() => setAbaAtiva(aba.id)}
                >
                  {aba.label}
                </button>
              ))}
            </div>

            <div className="cli-tab-body">
              {/* Cabeçalho comum às duas abas */}
              <div className="cli-grid" style={{ marginBottom: 20 }}>
                <div className="cli-field cli-col-4">
                  <label className="cli-label">Cliente <span className="cli-label-req">*</span></label>
                  <select className="cli-select" value={form.cliente} onChange={(e) => setField("cliente", e.target.value)}>
                    <option value="">Selecione...</option>
                    {MOCK_CLIENTES.map((c) => <option key={c} value={c}>{c}</option>)}
                  </select>
                </div>
                <div className="cli-field cli-col-4">
                  <label className="cli-label">Estab. Faturamento <span className="cli-label-req">*</span></label>
                  <input className="cli-input" placeholder="Cód. est. faturamento" value={form.estab_faturamento} onChange={(e) => setField("estab_faturamento", e.target.value)} maxLength={20} />
                  <span className="cli-field-hint">Código do estabelecimento de faturamento do cliente.</span>
                </div>
                <div className="cli-field cli-col-4">
                  <label className="cli-label">Representante <span className="cli-label-req">*</span></label>
                  <select className="cli-select" value={form.representante} onChange={(e) => setField("representante", e.target.value)}>
                    <option value="">Selecione...</option>
                    {MOCK_REPRESENTANTES.map((r) => <option key={r} value={r}>{r}</option>)}
                  </select>
                </div>
              </div>

              {/* ABA: ITENS */}
              {abaAtiva === "itens" && (
                <>
                  {itens.length === 0 ? (
                    <div className="cli-grid-empty">Nenhum item adicionado. Use o botão abaixo para incluir itens.</div>
                  ) : (
                    <table className="cli-grid-table">
                      <thead>
                        <tr>
                          <th style={{ width: "60%" }}>Item</th>
                          <th style={{ width: "25%" }}>Permissão</th>
                          <th style={{ width: "15%" }}></th>
                        </tr>
                      </thead>
                      <tbody>
                        {itens.map((linha) => (
                          <tr key={linha.id}>
                            <td>
                              <select className="cli-select" value={linha.item} onChange={(e) => handleItemChange(linha.id, "item", e.target.value)}>
                                <option value="">Selecione...</option>
                                {MOCK_ITENS.map((it) => <option key={it} value={it}>{it}</option>)}
                              </select>
                            </td>
                            <td>
                              <select className="cli-select" value={linha.permissao} onChange={(e) => handleItemChange(linha.id, "permissao", e.target.value)}>
                                {TIPOS_PERMISSAO.map((t) => <option key={t} value={t}>{t}</option>)}
                              </select>
                            </td>
                            <td style={{ textAlign: "center" }}>
                              <button className="cli-remove-btn" onClick={() => handleRemoveItem(linha.id)} title="Remover item">
                                <svg width="14" height="14" viewBox="0 0 16 16" fill="none"><path d="M3 3l10 10M13 3L3 13" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"/></svg>
                              </button>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  )}
                  <div className="cli-add-row">
                    <button className="cli-btn cli-btn-ghost cli-btn-sm" onClick={handleAddItem}>
                      <svg width="12" height="12" viewBox="0 0 12 12" fill="none"><path d="M6 2v8M2 6h8" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round"/></svg>
                      Adicionar Item
                    </button>
                  </div>
                </>
              )}

              {/* ABA: CLASSIFICAÇÃO */}
              {abaAtiva === "classificacao" && (
                <>
                  {classificacoes.length === 0 ? (
                    <div className="cli-grid-empty">Nenhuma classificação adicionada. Use o botão abaixo para incluir classificações.</div>
                  ) : (
                    <table className="cli-grid-table">
                      <thead>
                        <tr>
                          <th style={{ width: "60%" }}>Classificação</th>
                          <th style={{ width: "25%" }}>Permissão</th>
                          <th style={{ width: "15%" }}></th>
                        </tr>
                      </thead>
                      <tbody>
                        {classificacoes.map((linha) => (
                          <tr key={linha.id}>
                            <td>
                              <select className="cli-select" value={linha.classificacao} onChange={(e) => handleClassificacaoChange(linha.id, "classificacao", e.target.value)}>
                                <option value="">Selecione...</option>
                                {MOCK_CLASSIFICACOES.map((c) => <option key={c} value={c}>{c}</option>)}
                              </select>
                            </td>
                            <td>
                              <select className="cli-select" value={linha.permissao} onChange={(e) => handleClassificacaoChange(linha.id, "permissao", e.target.value)}>
                                {TIPOS_PERMISSAO.map((t) => <option key={t} value={t}>{t}</option>)}
                              </select>
                            </td>
                            <td style={{ textAlign: "center" }}>
                              <button className="cli-remove-btn" onClick={() => handleRemoveClassificacao(linha.id)} title="Remover classificação">
                                <svg width="14" height="14" viewBox="0 0 16 16" fill="none"><path d="M3 3l10 10M13 3L3 13" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"/></svg>
                              </button>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  )}
                  <div className="cli-add-row">
                    <button className="cli-btn cli-btn-ghost cli-btn-sm" onClick={handleAddClassificacao}>
                      <svg width="12" height="12" viewBox="0 0 12 12" fill="none"><path d="M6 2v8M2 6h8" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round"/></svg>
                      Adicionar Classificação
                    </button>
                  </div>
                </>
              )}
            </div>
          </div>
        </div>

        {/* FOOTER */}
        <footer className="cli-footer">
          <div className="cli-footer-left">
            <div className="cli-footer-stat">Itens: <strong>{itens.length}</strong></div>
            <div className="cli-footer-stat">Classificações: <strong>{classificacoes.length}</strong></div>
            <div className="cli-footer-stat">Módulo: <strong>Cliente</strong></div>
          </div>
          <div className="cli-footer-stat" style={{ gap: 8 }}>
            <span style={{ color: "#b0c8b8", fontSize: 11 }}>GRUPO VENTURE LTDA</span>
          </div>
        </footer>
      </div>
    </>
  );
}
