import { useState, useCallback } from "react";
import axios from "axios";
import {
  criarRegraItemConfig,
  listarRegrasItemConfig,
  MOCK_ITENS,
  MOCK_TABELAS,
  MOCK_CARACTERISTICAS_DISPONIVEIS,
  MOCK_OPERADORES,
  MOCK_VARIAVEIS,
  type RegraItemConfigDTO,
  type RegraItemConfigResponse,
  type RegraCaracteristicaDTO,
} from "@/services/itensConfigService";

// ─── Types ────────────────────────────────────────────────────────────────────

type FeedbackState = { type: "success" | "error" | "info"; message: string } | null;

interface FormRegraItem {
  item: string;
  caracteristicas: RegraCaracteristicaDTO[];
  tabela: string;
  campo: string;
  conteudo: string;
  descricao: string;
  situacao: 'Ativo' | 'Inativo';
}

const FORM_INICIAL: FormRegraItem = {
  item: "",
  caracteristicas: [],
  tabela: "",
  campo: "",
  conteudo: "",
  descricao: "",
  situacao: "Ativo",
};

const MOCK_CAMPOS_POR_TABELA: Record<string, Array<{ value: string; label: string }>> = {
  Contábil: [{ value: 'CONTA_CONTABIL', label: 'Conta Contábil' }, { value: 'CENTRO_CUSTO', label: 'Centro de Custo' }, { value: 'NATUREZA', label: 'Natureza' }],
  Comercial: [{ value: 'PRECO_VENDA', label: 'Preço de Venda' }, { value: 'COMISSAO', label: 'Comissão (%)' }, { value: 'GRUPO_FISCAL', label: 'Grupo Fiscal' }],
  Custos: [{ value: 'CUSTO_PADRAO', label: 'Custo Padrão' }, { value: 'CUSTO_MEDIO', label: 'Custo Médio' }, { value: 'CRITERIO_RATEIO', label: 'Critério de Rateio' }],
  Planejamento: [{ value: 'LEAD_TIME', label: 'Lead Time (dias)' }, { value: 'LOTE_MINIMO', label: 'Lote Mínimo' }, { value: 'ESTOQUE_SEG', label: 'Estoque Segurança' }],
  Planejadores: [{ value: 'PLANEJADOR', label: 'Planejador' }, { value: 'CALENDARIO', label: 'Calendário' }],
  Engenharia: [{ value: 'DESENHO_TECNICO', label: 'Desenho Técnico' }, { value: 'PESO_LIQUIDO', label: 'Peso Líquido' }, { value: 'REVISAO', label: 'Revisão' }],
  Estoque: [{ value: 'ARMAZEM', label: 'Armazém' }, { value: 'ENDERECO', label: 'Endereço' }, { value: 'TIPO_MOV', label: 'Tipo de Movimento' }],
  Suprimentos: [{ value: 'FORNECEDOR', label: 'Fornecedor' }, { value: 'PRAZO_ENTREGA', label: 'Prazo de Entrega' }, { value: 'COND_PAGAMENTO', label: 'Cond. Pagamento' }],
};

// ─── Helpers ──────────────────────────────────────────────────────────────────

function normalizeError(error: unknown, fallback: string): string {
  if (axios.isAxiosError(error)) {
    const data = error.response?.data as { message?: string; error?: string } | undefined;
    const msg = data?.message ?? data?.error;
    if (msg) return msg;
  }
  return error instanceof Error ? error.message : fallback;
}

// ─── Component ────────────────────────────────────────────────────────────────

export function Vite0118Page(): JSX.Element {
  const [form, setForm] = useState<FormRegraItem>(FORM_INICIAL);
  const [errors, setErrors] = useState<Partial<Record<keyof FormRegraItem, string>>>({});
  const [codigoEdit, setCodigoEdit] = useState<number | null>(null);

  const [filtroItem, setFiltroItem] = useState("");
  const [resultados, setResultados] = useState<RegraItemConfigResponse[]>([]);
  const [mostrarResultados, setMostrarResultados] = useState(false);

  const [isSaving, setIsSaving] = useState(false);
  const [isSearching, setIsSearching] = useState(false);
  const [feedback, setFeedback] = useState<FeedbackState>(null);

  // Característica inline form
  const [novaCarc, setNovaCarc] = useState<RegraCaracteristicaDTO>({ caracteristica: "", operador: "=", variavel: "" });

  const setField = useCallback(<K extends keyof FormRegraItem>(key: K, value: FormRegraItem[K]) => {
    setForm(p => {
      const next = { ...p, [key]: value };
      if (key === 'tabela') next.campo = ''; // reset campo when tabela changes
      return next;
    });
    setErrors(p => ({ ...p, [key]: undefined }));
    setFeedback(null);
  }, []);

  function addCaracteristica() {
    if (!novaCarc.caracteristica || !novaCarc.variavel) return;
    setForm(p => ({ ...p, caracteristicas: [...p.caracteristicas, { ...novaCarc }] }));
    setNovaCarc({ caracteristica: "", operador: "=", variavel: "" });
    setFeedback(null);
  }

  function removeCaracteristica(idx: number) {
    setForm(p => ({ ...p, caracteristicas: p.caracteristicas.filter((_, i) => i !== idx) }));
  }

  function validate(): boolean {
    const e: Partial<Record<keyof FormRegraItem, string>> = {};
    if (!form.item) e.item = "Item obrigatório.";
    if (!form.tabela) (e as any).tabela = "Tabela obrigatória.";
    if (!form.descricao.trim()) e.descricao = "Descrição obrigatória.";
    setErrors(e);
    return Object.keys(e).length === 0;
  }

  async function handlePesquisar() {
    setIsSearching(true);
    setFeedback(null);
    try {
      const results = await listarRegrasItemConfig({ item: filtroItem || undefined });
      setResultados(results);
      setMostrarResultados(true);
      if (results.length === 0) {
        setFeedback({ type: "info", message: "Nenhuma regra encontrada para o filtro informado." });
      }
    } catch (error) {
      setFeedback({ type: "error", message: normalizeError(error, "Erro ao pesquisar regras.") });
    } finally { setIsSearching(false); }
  }

  function handleSelectFromList(regra: RegraItemConfigResponse) {
    setForm({
      item: regra.item,
      caracteristicas: regra.caracteristicas,
      tabela: regra.tabela,
      campo: regra.campo,
      conteudo: regra.conteudo,
      descricao: regra.descricao,
      situacao: regra.situacao,
    });
    setErrors({});
    setFeedback(null);
    setCodigoEdit(regra.codigo);
  }

  async function handleSalvar() {
    if (!validate()) return;
    setIsSaving(true);
    setFeedback(null);
    try {
      const dto: RegraItemConfigDTO = { ...form, descricao: form.descricao.trim() };
      await criarRegraItemConfig(dto);
      setFeedback({ type: "success", message: "Regra de item configurado salva com sucesso." });
    } catch (error) {
      setFeedback({ type: "error", message: normalizeError(error, "Erro ao salvar.") });
    } finally { setIsSaving(false); }
  }

  function handleNovo() {
    setForm(FORM_INICIAL);
    setErrors({});
    setFeedback(null);
    setCodigoEdit(null);
    setNovaCarc({ caracteristica: "", operador: "=", variavel: "" });
  }

  function handleLimpar() {
    handleNovo();
    setMostrarResultados(false);
    setFiltroItem("");
  }

  const camposDisponiveis = form.tabela ? (MOCK_CAMPOS_POR_TABELA[form.tabela] ?? []) : [];

  return (
    <>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Inter:wght@300;400;500;600&display=swap');
        *, *::before, *::after { box-sizing: border-box; margin: 0; padding: 0; }

        .ite-root {
          min-height: 100vh; background: #f0f4ee;
          font-family: 'Inter', sans-serif; color: #1a2e22;
          display: flex; flex-direction: column;
        }
        .ite-topbar {
          height: 52px; background: #162e20;
          display: flex; align-items: center; justify-content: space-between;
          padding: 0 20px; flex-shrink: 0;
          border-bottom: 1px solid rgba(62,150,84,0.15);
        }
        .ite-topbar-left { display: flex; align-items: center; gap: 10px; }
        .ite-logo-mark {
          width: 28px; height: 28px; background: #3e9654;
          border-radius: 6px; display: flex; align-items: center; justify-content: center;
        }
        .ite-app-name { font-size: 13px; font-weight: 600; color: #e0f0e3; line-height: 1.1; }
        .ite-app-sub  { display: block; font-size: 9px; font-weight: 400; color: #3d6b4d; }
        .ite-screen-title {
          font-size: 12.5px; font-weight: 500; color: #5a9a6a;
          padding-left: 14px; margin-left: 14px;
          border-left: 1px solid rgba(255,255,255,0.08);
        }
        .ite-actionbar {
          background: #fff; border-bottom: 1px solid #dbe8d5;
          padding: 0 20px; display: flex; align-items: center;
          gap: 4px; height: 46px; flex-shrink: 0;
        }
        .ite-action-group {
          display: flex; align-items: center; gap: 4px;
          padding-right: 12px; margin-right: 8px;
          border-right: 1px solid #e8f0e4;
        }
        .ite-action-group:last-child { border-right: none; }
        .ite-action-label {
          font-size: 9.5px; font-weight: 600; letter-spacing: 0.8px;
          text-transform: uppercase; color: #96b8a0; margin-right: 4px; white-space: nowrap;
        }
        .ite-btn {
          display: inline-flex; align-items: center; gap: 6px;
          height: 32px; padding: 0 12px; border: 1.5px solid transparent;
          border-radius: 7px; font-family: 'Inter', sans-serif;
          font-size: 12.5px; font-weight: 500; cursor: pointer; white-space: nowrap;
          transition: background 0.13s, border-color 0.13s, color 0.13s;
        }
        .ite-btn-primary { background: #162e20; color: #dff0e2; border-color: #162e20; }
        .ite-btn-primary:hover:not(:disabled) { background: #1e3a2a; }
        .ite-btn-primary:disabled { opacity: 0.5; cursor: not-allowed; }
        .ite-btn-ghost { background: transparent; color: #4a7060; border-color: #d4e8d0; }
        .ite-btn-ghost:hover:not(:disabled) { background: #f0f8ec; border-color: #b0d4b8; color: #1a3828; }
        .ite-btn-ghost:disabled { opacity: 0.5; cursor: not-allowed; }
        .ite-btn-danger { background: transparent; color: #b94040; border-color: #f0c8c8; }
        .ite-btn-danger:hover:not(:disabled) { background: #fff0f0; border-color: #e09090; }
        .ite-btn-sm { height: 28px; padding: 0 9px; font-size: 12px; }
        .ite-btn-new {
          background: #eef9f0; color: #1a6030; border-color: #b4d8b8; font-weight: 600;
        }
        .ite-btn-new:hover:not(:disabled) { background: #dff5e4; border-color: #88c898; }
        .ite-btn-f {
          height: 32px; width: 32px; padding: 0; flex-shrink: 0;
          background: #f0f8ec; color: #3a6048; border: 1.5px solid #d4e8d0;
          border-radius: 7px; cursor: pointer; font-family: 'Inter', sans-serif;
          font-size: 12px; font-weight: 700; display: flex; align-items: center; justify-content: center;
          transition: background 0.12s;
        }
        .ite-btn-f:hover { background: #ddf0e0; }

        .ite-body {
          flex: 1; padding: 16px 20px; display: flex;
          flex-direction: column; gap: 0; overflow-y: auto;
        }
        .ite-body::-webkit-scrollbar { width: 5px; }
        .ite-body::-webkit-scrollbar-thumb { background: #cce0c8; border-radius: 4px; }

        .ite-section-banner {
          display: flex; align-items: center; gap: 10px; padding: 14px 0 8px;
        }
        .ite-section-banner:first-child { padding-top: 0; }
        .ite-section-pill {
          font-size: 9.5px; font-weight: 700; letter-spacing: 1.2px;
          text-transform: uppercase; color: #5a8068;
          background: #e0ede0; border: 1px solid #c8dcc8;
          border-radius: 20px; padding: 3px 10px; white-space: nowrap;
        }
        .ite-section-line { flex: 1; height: 1px; background: #dbe8d5; }
        .ite-section-hint { font-size: 11px; color: #96b8a0; white-space: nowrap; }

        .ite-card {
          background: #fff; border: 1px solid #dbe8d5;
          border-radius: 12px; overflow: hidden; margin-bottom: 14px;
        }
        .ite-card-header {
          display: flex; align-items: center; justify-content: space-between;
          padding: 12px 18px; border-bottom: 1px solid #edf5e8; background: #fafcf9;
        }
        .ite-card-header-left { display: flex; align-items: center; gap: 8px; }
        .ite-card-title { font-size: 12px; font-weight: 600; color: #2a4a35; text-transform: uppercase; letter-spacing: 0.6px; }
        .ite-card-badge {
          font-size: 10.5px; font-weight: 500; color: #3e9654;
          background: #eef5ea; border: 1px solid #c4dfc8; border-radius: 12px; padding: 2px 8px;
        }
        .ite-card-body { padding: 18px 18px; }

        .ite-grid { display: grid; grid-template-columns: repeat(12, 1fr); gap: 16px 14px; align-items: start; }
        .ite-col-2  { grid-column: span 2; }
        .ite-col-3  { grid-column: span 3; }
        .ite-col-4  { grid-column: span 4; }
        .ite-col-5  { grid-column: span 5; }
        .ite-col-6  { grid-column: span 6; }
        .ite-col-8  { grid-column: span 8; }
        .ite-col-12 { grid-column: span 12; }

        .ite-field { display: flex; flex-direction: column; gap: 5px; }
        .ite-label {
          font-size: 10.5px; font-weight: 600; color: #5a8068;
          text-transform: uppercase; letter-spacing: 0.4px;
          display: flex; align-items: center; gap: 4px;
        }
        .ite-label-req { color: #c84040; font-size: 12px; line-height: 1; }
        .ite-input {
          width: 100%; height: 36px; background: #f8fbf6;
          border: 1.5px solid #d4e8cc; border-radius: 7px;
          padding: 0 10px; font-family: 'Inter', sans-serif;
          font-size: 13px; color: #1a2e22; outline: none;
          transition: border-color 0.13s, box-shadow 0.13s;
        }
        .ite-input:focus { border-color: #3e9654; box-shadow: 0 0 0 2px rgba(62,150,84,0.1); }
        .ite-input::placeholder { color: #b0c8b8; font-size: 12px; }
        .ite-input:disabled { background: #f0f4ee; color: #8aaa94; cursor: not-allowed; border-color: #e0ead8; }
        .ite-input.has-error { border-color: #e05252; box-shadow: 0 0 0 2px rgba(224,82,82,0.1); }

        .ite-select {
          width: 100%; height: 36px; background: #f8fbf6;
          border: 1.5px solid #d4e8cc; border-radius: 7px;
          padding: 0 28px 0 10px; font-family: 'Inter', sans-serif;
          font-size: 13px; color: #1a2e22; outline: none;
          appearance: none; cursor: pointer;
          background-image: url("data:image/svg+xml,%3Csvg width='10' height='6' viewBox='0 0 10 6' xmlns='http://www.w3.org/2000/svg'%3E%3Cpath d='M1 1l4 4 4-4' stroke='%23789a84' stroke-width='1.5' fill='none' stroke-linecap='round' stroke-linejoin='round'/%3E%3C/svg%3E");
          background-repeat: no-repeat; background-position: right 10px center;
          transition: border-color 0.13s;
        }
        .ite-select:focus { border-color: #3e9654; box-shadow: 0 0 0 2px rgba(62,150,84,0.1); }

        .ite-field-error { font-size: 11px; color: #c84040; margin-top: 2px; display: flex; align-items: center; gap: 4px; }
        .ite-field-hint  { font-size: 11px; color: #7a9c84; margin-top: 2px; line-height: 1.45; }

        .ite-section-sep { height: 1px; background: #edf5e8; margin: 16px 0; }
        .ite-section-label {
          font-size: 10px; font-weight: 700; letter-spacing: 1px;
          text-transform: uppercase; color: #a0b8a8; margin-bottom: 12px;
          display: flex; align-items: center; gap: 8px;
        }
        .ite-section-label::after { content: ''; flex: 1; height: 1px; background: #e8f0e4; }

        .ite-filter-row { display: flex; align-items: flex-end; gap: 12px; flex-wrap: wrap; }

        .ite-results-wrap { border-top: 1px solid #edf5e8; overflow-x: auto; }
        .ite-results-bar {
          display: flex; align-items: center; justify-content: space-between;
          padding: 10px 18px; background: #f4f9f2; border-bottom: 1px solid #e8f0e4;
        }
        .ite-results-bar-left { display: flex; align-items: center; gap: 8px; }
        .ite-results-bar-label { font-size: 11px; font-weight: 600; color: #4a7060; text-transform: uppercase; letter-spacing: 0.5px; }
        .ite-results-hint { font-size: 11px; color: #96b8a0; }
        .ite-results-table { width: 100%; border-collapse: collapse; font-size: 13px; }
        .ite-results-table th {
          background: #f4f9f2; padding: 8px 12px; text-align: left;
          font-size: 10.5px; font-weight: 700; color: #5a8068;
          text-transform: uppercase; letter-spacing: 0.5px;
          border-bottom: 1.5px solid #dbe8d5; white-space: nowrap;
        }
        .ite-results-table td { padding: 9px 12px; border-bottom: 1px solid #f0f6ec; color: #243830; vertical-align: middle; }
        .ite-results-table tbody tr { cursor: pointer; transition: background 0.1s; }
        .ite-results-table tbody tr:hover { background: #eef9f0; }
        .ite-results-empty { text-align: center; padding: 28px 12px; color: #96b8a0; font-size: 12.5px; }

        .ite-carac-inline { display: flex; gap: 8px; align-items: flex-end; margin-bottom: 10px; }
        .ite-carac-table { width: 100%; border-collapse: collapse; font-size: 12.5px; margin-top: 8px; }
        .ite-carac-table th {
          background: #f4f9f2; padding: 6px 10px; text-align: left;
          font-size: 10px; font-weight: 700; color: #5a8068;
          text-transform: uppercase; letter-spacing: 0.5px;
          border-bottom: 1px solid #dbe8d5;
        }
        .ite-carac-table td { padding: 7px 10px; border-bottom: 1px solid #f0f6ec; color: #243830; }
        .ite-remove-btn {
          background: transparent; border: none; cursor: pointer; color: #c89090;
          padding: 3px 6px; border-radius: 5px; font-size: 12px; font-family: 'Inter', sans-serif;
          transition: background 0.12s, color 0.12s;
        }
        .ite-remove-btn:hover { background: #fdecea; color: #b94040; }

        .ite-feedback {
          display: flex; align-items: center; gap: 9px; padding: 11px 15px;
          border-radius: 9px; font-size: 13px; animation: iteFadeIn 0.2s ease;
          margin-bottom: 14px;
        }
        .ite-feedback.success { background: #f0faf2; border: 1px solid #b4dec0; color: #1e6030; }
        .ite-feedback.error   { background: #fff5f5; border: 1px solid #f8c0c0; border-left: 3px solid #e05252; color: #b91c1c; }
        .ite-feedback.info    { background: #f0f8ff; border: 1px solid #c7def8; border-left: 3px solid #4a90d9; color: #1a4070; }

        @keyframes spin { to { transform: rotate(360deg); } }
        .ite-spinner {
          width: 14px; height: 14px; flex-shrink: 0;
          border: 2px solid rgba(223,240,226,0.3); border-top-color: #dff0e2;
          border-radius: 50%; animation: spin 0.65s linear infinite;
        }
        .ite-spinner-dark {
          width: 14px; height: 14px; flex-shrink: 0;
          border: 2px solid #d4e8cc; border-top-color: #3e9654;
          border-radius: 50%; animation: spin 0.65s linear infinite;
        }
        @keyframes iteFadeIn { from { opacity: 0; transform: translateY(-4px); } to { opacity: 1; transform: translateY(0); } }
      `}</style>

      <div className="ite-root">

        <header className="ite-topbar">
          <div className="ite-topbar-left">
            <div className="ite-logo-mark">
              <svg width="15" height="15" viewBox="0 0 18 18" fill="none">
                <rect x="1.5" y="1.5" width="6" height="6" rx="1.2" fill="rgba(255,255,255,0.9)" />
                <rect x="10.5" y="1.5" width="6" height="6" rx="1.2" fill="rgba(255,255,255,0.4)" />
                <rect x="1.5" y="10.5" width="6" height="6" rx="1.2" fill="rgba(255,255,255,0.4)" />
                <rect x="10.5" y="10.5" width="6" height="6" rx="1.2" fill="rgba(255,255,255,0.7)" />
              </svg>
            </div>
            <span className="ite-app-name">
              Venture<span className="ite-app-sub">ERP &amp; Soluções</span>
            </span>
            <span className="ite-screen-title">VITE0118 — Cadastro de Regras de Itens Configurados</span>
          </div>
        </header>

        <div className="ite-actionbar">
          <div className="ite-action-group">
            <span className="ite-action-label">Cadastro</span>
            <button className="ite-btn ite-btn-new" onClick={handleNovo} disabled={isSaving}>
              <svg width="12" height="12" viewBox="0 0 12 12" fill="none"><path d="M6 2v8M2 6h8" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" /></svg>
              Novo
            </button>
          </div>
          <div className="ite-action-group">
            <span className="ite-action-label">Ações</span>
            <button className="ite-btn ite-btn-primary" onClick={() => void handleSalvar()} disabled={isSaving}>
              {isSaving ? <><div className="ite-spinner" />Salvando...</> : <><svg width="13" height="13" viewBox="0 0 16 16" fill="none"><path d="M2 2h9l3 3v9a1 1 0 01-1 1H3a1 1 0 01-1-1V3a1 1 0 011-1z" stroke="currentColor" strokeWidth="1.4" strokeLinejoin="round" /><path d="M5 2v4h6V2M5 9h6" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" /></svg>Salvar</>}
            </button>
            <button className="ite-btn ite-btn-danger" onClick={handleLimpar} disabled={isSaving}>
              <svg width="13" height="13" viewBox="0 0 16 16" fill="none"><path d="M3 3l10 10M13 3L3 13" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" /></svg>
              Limpar
            </button>
          </div>
          <div className="ite-action-group">
            <button className="ite-btn ite-btn-ghost">
              <svg width="13" height="13" viewBox="0 0 16 16" fill="none"><circle cx="8" cy="8" r="6" stroke="currentColor" strokeWidth="1.4" /><path d="M8 7v4M8 5.5h.01" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" /></svg>
              Ajuda
            </button>
          </div>
        </div>

        <div className="ite-body">

          {feedback && (
            <div className={`ite-feedback ${feedback.type}`}>
              <svg width="15" height="15" viewBox="0 0 16 16" fill="none">
                {feedback.type === "success"
                  ? <path d="M3 8l3.5 3.5L13 5" stroke="#1e6030" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
                  : feedback.type === "error"
                    ? <><circle cx="8" cy="8" r="6" stroke="#e05252" strokeWidth="1.4" /><path d="M8 5v3.5M8 10.5h.01" stroke="#e05252" strokeWidth="1.4" strokeLinecap="round" /></>
                    : <><circle cx="8" cy="8" r="6" stroke="#4a90d9" strokeWidth="1.4" /><path d="M8 7v4M8 5.5h.01" stroke="#4a90d9" strokeWidth="1.4" strokeLinecap="round" /></>}
              </svg>
              {feedback.message}
            </div>
          )}

          {/* ═══════════════════════════════════════════════════════════ */}
          {/* SEÇÃO 1 — PESQUISAR                                         */}
          {/* ═══════════════════════════════════════════════════════════ */}

          <div className="ite-section-banner">
            <span className="ite-section-pill">1 — Pesquisar</span>
            <div className="ite-section-line" />
            <span className="ite-section-hint">Filtre por Item existente</span>
          </div>

          <div className="ite-card">
            <div className="ite-card-header">
              <div className="ite-card-header-left">
                <svg width="14" height="14" viewBox="0 0 16 16" fill="none"><circle cx="6.5" cy="6.5" r="4.5" stroke="#3e9654" strokeWidth="1.4" /><path d="M10 10l3.5 3.5" stroke="#3e9654" strokeWidth="1.4" strokeLinecap="round" /></svg>
                <span className="ite-card-title">Pesquisa de Regras de Itens Configurados</span>
              </div>
            </div>

            <div className="ite-card-body" style={{ paddingBottom: 14 }}>
              <div className="ite-filter-row">
                <div className="ite-field" style={{ flex: "0 0 280px" }}>
                  <label className="ite-label">Item</label>
                  <select className="ite-select" value={filtroItem} onChange={e => setFiltroItem(e.target.value)}>
                    <option value="">Todos</option>
                    {MOCK_ITENS.map(i => <option key={i.value} value={i.value}>{i.label}</option>)}
                  </select>
                </div>
                <div style={{ alignSelf: "flex-end" }}>
                  <button className="ite-btn ite-btn-ghost" onClick={() => void handlePesquisar()} disabled={isSearching}>
                    {isSearching ? <><div className="ite-spinner-dark" />Buscando...</> : <><svg width="13" height="13" viewBox="0 0 16 16" fill="none"><circle cx="6.5" cy="6.5" r="4.5" stroke="currentColor" strokeWidth="1.4" /><path d="M10 10l3.5 3.5" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" /></svg>Pesquisar</>}
                  </button>
                </div>
              </div>
            </div>

            {mostrarResultados && (
              <div className="ite-results-wrap">
                <div className="ite-results-bar">
                  <div className="ite-results-bar-left">
                    <svg width="13" height="13" viewBox="0 0 16 16" fill="none"><path d="M2 4h12M2 8h12M2 12h8" stroke="#5a8068" strokeWidth="1.4" strokeLinecap="round" /></svg>
                    <span className="ite-results-bar-label">Resultados</span>
                    <span className="ite-card-badge">{resultados.length} registro(s)</span>
                  </div>
                  <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                    <span className="ite-results-hint">↓ Clique para editar</span>
                    <button className="ite-btn ite-btn-ghost ite-btn-sm" onClick={() => setMostrarResultados(false)}>Fechar</button>
                  </div>
                </div>
                {resultados.length === 0 ? (
                  <div className="ite-results-empty">Nenhuma regra encontrada.</div>
                ) : (
                  <table className="ite-results-table">
                    <thead>
                      <tr>
                        <th style={{ width: 70 }}>Código</th>
                        <th>Item</th>
                        <th>Tabela</th>
                        <th>Campo</th>
                        <th>Descrição</th>
                        <th style={{ width: 90 }}>Situação</th>
                      </tr>
                    </thead>
                    <tbody>
                      {resultados.map(r => (
                        <tr key={r.codigo} onClick={() => handleSelectFromList(r)}>
                          <td style={{ fontWeight: 600, color: "#1a4a2a" }}>{r.codigo}</td>
                          <td>{r.item}</td>
                          <td>{r.tabela}</td>
                          <td>{r.campo}</td>
                          <td>{r.descricao}</td>
                          <td>
                            <span style={{
                              fontSize: 11, fontWeight: 600, borderRadius: 12, padding: '2px 8px',
                              background: r.situacao === 'Ativo' ? '#e8f5e0' : '#fde8e8',
                              color: r.situacao === 'Ativo' ? '#1e6030' : '#b91c1c',
                              border: r.situacao === 'Ativo' ? '1px solid #b4dec0' : '1px solid #f8c0c0',
                            }}>{r.situacao}</span>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                )}
              </div>
            )}
          </div>

          {/* ═══════════════════════════════════════════════════════════ */}
          {/* SEÇÃO 2 — CRIAR / EDITAR                                   */}
          {/* ═══════════════════════════════════════════════════════════ */}

          <div className="ite-section-banner">
            <span className="ite-section-pill">2 — Criar / Editar</span>
            <div className="ite-section-line" />
            <span className="ite-section-hint">{codigoEdit ? `Editando regra #${codigoEdit}` : "Preencha os campos e clique em Salvar"}</span>
          </div>

          <div className="ite-card">
            <div className="ite-card-header">
              <div className="ite-card-header-left">
                <svg width="14" height="14" viewBox="0 0 16 16" fill="none"><path d="M2 2h9l3 3v9a1 1 0 01-1 1H3a1 1 0 01-1-1V3a1 1 0 011-1z" stroke="#3e9654" strokeWidth="1.4" strokeLinejoin="round" /><path d="M5 2v4h6V2M5 9h6" stroke="#3e9654" strokeWidth="1.4" strokeLinecap="round" /></svg>
                <span className="ite-card-title">Regra de Item Configurado</span>
              </div>
              {codigoEdit
                ? <span style={{ fontSize: 11, fontWeight: 600, color: '#7a5200', background: '#fff8e0', border: '1px solid #e0c860', borderRadius: 20, padding: '3px 10px' }}>Editando #{codigoEdit}</span>
                : <span style={{ fontSize: 11, fontWeight: 600, color: '#1e5818', background: '#e8f5e0', border: '1px solid #a8d898', borderRadius: 20, padding: '3px 10px' }}>Novo Cadastro</span>
              }
            </div>

            <div className="ite-card-body">

              <div className="ite-grid">
                <div className="ite-field ite-col-4">
                  <label className="ite-label">Item <span className="ite-label-req">*</span></label>
                  <select className="ite-select" value={form.item} onChange={e => setField("item", e.target.value)}>
                    <option value="">Selecione...</option>
                    {MOCK_ITENS.map(i => <option key={i.value} value={i.value}>{i.label}</option>)}
                  </select>
                  {errors.item && <span className="ite-field-error">{errors.item}</span>}
                </div>
              </div>

              <div className="ite-section-sep" />
              <div className="ite-section-label">Regras (Características)</div>

              {/* Inline add característica */}
              <div className="ite-carac-inline">
                <div className="ite-field" style={{ flex: "1 1 200px" }}>
                  <label className="ite-label">Característica</label>
                  <select className="ite-select" value={novaCarc.caracteristica} onChange={e => setNovaCarc(p => ({ ...p, caracteristica: e.target.value }))}>
                    <option value="">Selecione...</option>
                    {MOCK_CARACTERISTICAS_DISPONIVEIS.map(c => <option key={c.value} value={c.value}>{c.label}</option>)}
                  </select>
                </div>
                <div className="ite-field" style={{ flex: "0 0 180px" }}>
                  <label className="ite-label">Operador</label>
                  <select className="ite-select" value={novaCarc.operador} onChange={e => setNovaCarc(p => ({ ...p, operador: e.target.value }))}>
                    {MOCK_OPERADORES.map(o => <option key={o.value} value={o.value}>{o.label}</option>)}
                  </select>
                </div>
                <div className="ite-field" style={{ flex: "1 1 200px" }}>
                  <label className="ite-label">Variável</label>
                  <select className="ite-select" value={novaCarc.variavel} onChange={e => setNovaCarc(p => ({ ...p, variavel: e.target.value }))}>
                    <option value="">Selecione...</option>
                    {MOCK_VARIAVEIS.map(v => <option key={v.value} value={v.value}>{v.label}</option>)}
                  </select>
                </div>
                <div style={{ alignSelf: "flex-end" }}>
                  <button className="ite-btn ite-btn-ghost" onClick={addCaracteristica}>
                    <svg width="12" height="12" viewBox="0 0 12 12" fill="none"><path d="M6 2v8M2 6h8" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" /></svg>
                    Adicionar
                  </button>
                </div>
              </div>

              {form.caracteristicas.length > 0 && (
                <table className="ite-carac-table">
                  <thead>
                    <tr>
                      <th>Característica</th>
                      <th>Operador</th>
                      <th>Variável</th>
                      <th style={{ width: 50 }}></th>
                    </tr>
                  </thead>
                  <tbody>
                    {form.caracteristicas.map((c, i) => (
                      <tr key={i}>
                        <td>{c.caracteristica}</td>
                        <td>{c.operador}</td>
                        <td>{c.variavel}</td>
                        <td>
                          <button className="ite-remove-btn" onClick={() => removeCaracteristica(i)} title="Remover">✕</button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              )}

              <div className="ite-section-sep" />
              <div className="ite-section-label">Cadastro de Regras</div>

              <div className="ite-grid">
                <div className="ite-field ite-col-4">
                  <label className="ite-label">Tabela <span className="ite-label-req">*</span></label>
                  <select className="ite-select" value={form.tabela} onChange={e => setField("tabela", e.target.value)}>
                    <option value="">Selecione...</option>
                    {MOCK_TABELAS.map(t => <option key={t} value={t}>{t}</option>)}
                  </select>
                  {(errors as any).tabela && <span className="ite-field-error">{(errors as any).tabela}</span>}
                </div>
                <div className="ite-field ite-col-4">
                  <label className="ite-label">Campo</label>
                  <select className="ite-select" value={form.campo} onChange={e => setField("campo", e.target.value)} disabled={!form.tabela}>
                    <option value="">Selecione...</option>
                    {camposDisponiveis.map(c => <option key={c.value} value={c.value}>{c.label}</option>)}
                  </select>
                </div>
                <div className="ite-field ite-col-4">
                  <label className="ite-label">Conteúdo</label>
                  <div style={{ display: "flex", gap: 6 }}>
                    <input className="ite-input" style={{ flex: 1 }} placeholder="Conteúdo do campo" value={form.conteudo} onChange={e => setField("conteudo", e.target.value)} />
                    <button className="ite-btn-f" title="Fórmula">F</button>
                  </div>
                </div>
              </div>

              <div className="ite-grid" style={{ marginTop: 0 }}>
                <div className="ite-field ite-col-6">
                  <label className="ite-label">Descrição <span className="ite-label-req">*</span></label>
                  <input className={`ite-input${errors.descricao ? " has-error" : ""}`} placeholder="Descrição da regra" value={form.descricao} onChange={e => setField("descricao", e.target.value)} />
                  {errors.descricao && <span className="ite-field-error">{errors.descricao}</span>}
                </div>
                <div className="ite-field ite-col-3">
                  <label className="ite-label">Situação</label>
                  <select className="ite-select" value={form.situacao} onChange={e => setField("situacao", e.target.value as 'Ativo' | 'Inativo')}>
                    <option value="Ativo">Ativo</option>
                    <option value="Inativo">Inativo</option>
                  </select>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </>
  );
}
