import { useState, useCallback } from "react";
import {
  type PoliticaDescontoResponse,
  type PoliticaLinhaDTO,
  type GeracaoAutomaticaDTO,
} from "@/services/pdvPoliticaService";

// ─── Constants ────────────────────────────────────────────────────────────────

const TIPO_OPCOES = ["Informação", "Escolha", "Opcional"] as const;
type TipoPolitica = (typeof TIPO_OPCOES)[number];

const MOCK_POLITICAS: PoliticaDescontoResponse[] = [
  { prioridade: 1, sequencia: 100, validade_inicial: "2026-01-01", validade_final: "2026-12-31", tipo: "Informação", permite_alterar_descontos: true, usada_politica_comissoes: false, politicas_aplicadas_itens: true, permite_valores_maiores: false, opcao_prazo_medio: false, opcao_tipo_representante: true },
  { prioridade: 2, sequencia: 200, validade_inicial: "2026-06-01", validade_final: "2027-05-31", tipo: "Escolha", permite_alterar_descontos: false, usada_politica_comissoes: true, politicas_aplicadas_itens: false, permite_valores_maiores: true, opcao_prazo_medio: true, opcao_tipo_representante: false },
  { prioridade: 3, sequencia: 300, validade_inicial: "2026-03-01", validade_final: "", tipo: "Opcional", permite_alterar_descontos: true, usada_politica_comissoes: true, politicas_aplicadas_itens: true, permite_valores_maiores: true, opcao_prazo_medio: false, opcao_tipo_representante: false },
];

// ─── Types ────────────────────────────────────────────────────────────────────

type ModoForm = "novo" | "edicao";
type FeedbackState = { type: "success" | "error" | "info"; message: string } | null;

interface FormPolitica {
  prioridade: string;
  sequencia: string;
  validade_inicial: string;
  validade_final: string;
  tipo: TipoPolitica;
  permite_alterar_descontos: boolean;
  usada_politica_comissoes: boolean;
  politicas_aplicadas_itens: boolean;
  permite_valores_maiores: boolean;
  opcao_prazo_medio: boolean;
  opcao_tipo_representante: boolean;
}

const FORM_INICIAL: FormPolitica = {
  prioridade: "",
  sequencia: "",
  validade_inicial: "",
  validade_final: "",
  tipo: "Informação",
  permite_alterar_descontos: false,
  usada_politica_comissoes: false,
  politicas_aplicadas_itens: false,
  permite_valores_maiores: false,
  opcao_prazo_medio: false,
  opcao_tipo_representante: false,
};

// ─── Helpers ──────────────────────────────────────────────────────────────────

function formatDateBR(iso: string): string {
  if (!iso || iso.length < 10) return "—";
  const [y, m, d] = iso.substring(0, 10).split("-");
  return `${d}/${m}/${y}`;
}

const TIPO_BADGE_CLASS: Record<TipoPolitica, string> = {
  "Informação": "pdv-tipo-info",
  "Escolha":    "pdv-tipo-escolha",
  "Opcional":   "pdv-tipo-opcional",
};

// ─── Component ────────────────────────────────────────────────────────────────

export function Vpdv0108Page(): JSX.Element {
  const [form, setForm] = useState<FormPolitica>(FORM_INICIAL);
  const [modoForm, setModoForm] = useState<ModoForm>("novo");
  const [codigoEdit, setCodigoEdit] = useState<number | null>(null);
  const [errors, setErrors] = useState<Partial<Record<keyof FormPolitica, string>>>({});

  // Search
  const [filtroPrioridade, setFiltroPrioridade] = useState("");
  const [filtroSequencia, setFiltroSequencia] = useState("");
  const [filtroValidade, setFiltroValidade] = useState("");
  const [filtroTipo, setFiltroTipo] = useState("");
  const [resultados, setResultados] = useState<PoliticaDescontoResponse[]>([]);
  const [mostrarResultados, setMostrarResultados] = useState(false);

  // Modals
  const [showPoliticaModal, setShowPoliticaModal] = useState(false);
  const [showGeracaoModal, setShowGeracaoModal] = useState(false);
  const [linhasPolitica, setLinhasPolitica] = useState<PoliticaLinhaDTO[]>([]);
  const [geracoes, setGeracoes] = useState<GeracaoAutomaticaDTO[]>([]);

  // Loading / feedback
  const [isSaving, setIsSaving] = useState(false);
  const [isSearching, setIsSearching] = useState(false);
  const [feedback, setFeedback] = useState<FeedbackState>(null);

  const [linhaForm, setLinhaForm] = useState<PoliticaLinhaDTO>({ linha: 1, inicio: 0, fim: 0, permite_valores_maiores: false });
  const [geracaoForm, setGeracaoForm] = useState<GeracaoAutomaticaDTO>({ sequencia: 1, descricao: "", tipo: "Percentual", valor_minimo: 0, valor_maximo: 0, default_valor: 0 });

  const setField = useCallback(
    <K extends keyof FormPolitica>(key: K, value: FormPolitica[K]) => {
      setForm((prev) => ({ ...prev, [key]: value }));
      setErrors((prev) => ({ ...prev, [key]: undefined }));
      setFeedback(null);
    },
    [],
  );

  function validate(): boolean {
    const e: Partial<Record<keyof FormPolitica, string>> = {};
    if (!form.prioridade.trim()) e.prioridade = "Prioridade obrigatória.";
    else if (isNaN(Number(form.prioridade)) || Number(form.prioridade) <= 0) e.prioridade = "Deve ser número positivo.";
    if (!form.sequencia.trim()) e.sequencia = "Sequência obrigatória.";
    else if (isNaN(Number(form.sequencia)) || Number(form.sequencia) <= 0) e.sequencia = "Deve ser número positivo.";
    setErrors(e);
    return Object.keys(e).length === 0;
  }

  async function handlePesquisar() {
    setIsSearching(true);
    setFeedback(null);
    try {
      await new Promise((r) => setTimeout(r, 600));
      let filtered = MOCK_POLITICAS;
      if (filtroPrioridade) filtered = filtered.filter((p) => String(p.prioridade).includes(filtroPrioridade));
      if (filtroSequencia) filtered = filtered.filter((p) => String(p.sequencia).includes(filtroSequencia));
      if (filtroValidade) filtered = filtered.filter((p) => p.validade_inicial <= filtroValidade && (!p.validade_final || p.validade_final >= filtroValidade));
      if (filtroTipo) filtered = filtered.filter((p) => p.tipo === filtroTipo);
      setResultados(filtered);
      setMostrarResultados(true);
      if (filtered.length === 0) setFeedback({ type: "info", message: "Nenhuma política encontrada." });
    } catch (error) {
      setFeedback({ type: "error", message: "Erro ao pesquisar políticas." });
    } finally { setIsSearching(false); }
  }

  function handleSelectFromList(p: PoliticaDescontoResponse) {
    setForm({
      prioridade: String(p.prioridade),
      sequencia: String(p.sequencia),
      validade_inicial: p.validade_inicial,
      validade_final: p.validade_final,
      tipo: p.tipo as TipoPolitica,
      permite_alterar_descontos: p.permite_alterar_descontos,
      usada_politica_comissoes: p.usada_politica_comissoes,
      politicas_aplicadas_itens: p.politicas_aplicadas_itens,
      permite_valores_maiores: p.permite_valores_maiores,
      opcao_prazo_medio: p.opcao_prazo_medio,
      opcao_tipo_representante: p.opcao_tipo_representante,
    });
    setModoForm("edicao");
    setCodigoEdit(p.sequencia);
    setErrors({});
    setFeedback({ type: "info", message: `Política Seq. ${p.sequencia} carregada para edição.` });
  }

  async function handleSalvar() {
    if (!validate()) return;
    setIsSaving(true);
    setFeedback(null);
    try {
      await new Promise((r) => setTimeout(r, 800));
      setFeedback({ type: "success", message: `Política Seq. ${form.sequencia} salva com sucesso.` });
    } catch (error) {
      setFeedback({ type: "error", message: "Erro ao salvar política." });
    } finally { setIsSaving(false); }
  }

  function handleNovo() {
    setForm(FORM_INICIAL);
    setErrors({});
    setFeedback(null);
    setModoForm("novo");
    setCodigoEdit(null);
  }

  function handleLimpar() {
    handleNovo();
    setMostrarResultados(false);
    setLinhasPolitica([]);
    setGeracoes([]);
  }

  function addLinha() {
    setLinhasPolitica((prev) => {
      const next = [...prev, linhaForm];
      setLinhaForm({ linha: next.length + 1, inicio: 0, fim: 0, permite_valores_maiores: false });
      return next;
    });
    setFeedback({ type: "success", message: "Linha adicionada." });
  }

  function addGeracao() {
    setGeracoes((prev) => {
      const next = [...prev, geracaoForm];
      setGeracaoForm({ sequencia: next.length + 1, descricao: "", tipo: "Percentual", valor_minimo: 0, valor_maximo: 0, default_valor: 0 });
      return next;
    });
    setFeedback({ type: "success", message: "Geração automática adicionada." });
  }

  return (
    <>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Inter:wght@300;400;500;600&display=swap');
        *, *::before, *::after { box-sizing: border-box; margin: 0; padding: 0; }

        .pdv-root { min-height: 100vh; background: #f0f4ee; font-family: 'Inter', sans-serif; color: #1a2e22; display: flex; flex-direction: column; }

        /* TOPBAR */
        .pdv-topbar { height: 52px; background: #162e20; display: flex; align-items: center; justify-content: space-between; padding: 0 20px; flex-shrink: 0; border-bottom: 1px solid rgba(62,150,84,0.15); }
        .pdv-topbar-left { display: flex; align-items: center; gap: 10px; }
        .pdv-logo-mark { width: 28px; height: 28px; background: #3e9654; border-radius: 6px; display: flex; align-items: center; justify-content: center; }
        .pdv-app-name { font-size: 13px; font-weight: 600; color: #e0f0e3; line-height: 1.1; }
        .pdv-app-sub { display: block; font-size: 9px; font-weight: 400; color: #3d6b4d; }
        .pdv-screen-title { font-size: 12.5px; font-weight: 500; color: #5a9a6a; padding-left: 14px; margin-left: 14px; border-left: 1px solid rgba(255,255,255,0.08); }

        /* ACTION BAR */
        .pdv-actionbar { background: #fff; border-bottom: 1px solid #dbe8d5; padding: 0 20px; display: flex; align-items: center; gap: 4px; height: 46px; flex-shrink: 0; }
        .pdv-action-group { display: flex; align-items: center; gap: 4px; padding-right: 12px; margin-right: 8px; border-right: 1px solid #e8f0e4; }
        .pdv-action-group:last-child { border-right: none; }
        .pdv-action-label { font-size: 9.5px; font-weight: 600; letter-spacing: 0.8px; text-transform: uppercase; color: #96b8a0; margin-right: 4px; white-space: nowrap; }
        .pdv-btn { display: inline-flex; align-items: center; gap: 6px; height: 32px; padding: 0 12px; border: 1.5px solid transparent; border-radius: 7px; font-family: 'Inter', sans-serif; font-size: 12.5px; font-weight: 500; cursor: pointer; white-space: nowrap; transition: background 0.13s, border-color 0.13s, color 0.13s; }
        .pdv-btn-primary { background: #162e20; color: #dff0e2; border-color: #162e20; }
        .pdv-btn-primary:hover:not(:disabled) { background: #1e3a2a; }
        .pdv-btn-primary:disabled { opacity: 0.5; cursor: not-allowed; }
        .pdv-btn-ghost { background: transparent; color: #4a7060; border-color: #d4e8d0; }
        .pdv-btn-ghost:hover:not(:disabled) { background: #f0f8ec; border-color: #b0d4b8; color: #1a3828; }
        .pdv-btn-ghost:disabled { opacity: 0.5; cursor: not-allowed; }
        .pdv-btn-danger { background: transparent; color: #b94040; border-color: #f0c8c8; }
        .pdv-btn-danger:hover:not(:disabled) { background: #fff0f0; border-color: #e09090; }
        .pdv-btn-sm { height: 28px; padding: 0 9px; font-size: 12px; }
        .pdv-btn-new { background: #eef9f0; color: #1a6030; border-color: #b4d8b8; font-weight: 600; }
        .pdv-btn-new:hover:not(:disabled) { background: #dff5e4; border-color: #88c898; }
        .pdv-btn-accent { background: #fdf3e0; color: #6a4a10; border-color: #e0c890; font-weight: 500; }
        .pdv-btn-accent:hover:not(:disabled) { background: #f8e8c0; border-color: #d0b870; }

        /* BODY */
        .pdv-body { flex: 1; padding: 16px 20px; display: flex; flex-direction: column; gap: 0; overflow-y: auto; }
        .pdv-body::-webkit-scrollbar { width: 5px; }
        .pdv-body::-webkit-scrollbar-thumb { background: #cce0c8; border-radius: 4px; }

        /* SECTION BANNER */
        .pdv-section-banner { display: flex; align-items: center; gap: 10px; padding: 14px 0 8px; }
        .pdv-section-banner:first-child { padding-top: 0; }
        .pdv-section-banner-pill { font-size: 9.5px; font-weight: 700; letter-spacing: 1.2px; text-transform: uppercase; color: #5a8068; background: #e0ede0; border: 1px solid #c8dcc8; border-radius: 20px; padding: 3px 10px; white-space: nowrap; }
        .pdv-section-banner-line { flex: 1; height: 1px; background: #dbe8d5; }
        .pdv-section-banner-hint { font-size: 11px; color: #96b8a0; white-space: nowrap; }

        /* CARD */
        .pdv-card { background: #fff; border: 1px solid #dbe8d5; border-radius: 12px; overflow: hidden; margin-bottom: 14px; }
        .pdv-card-header { display: flex; align-items: center; justify-content: space-between; padding: 12px 18px; border-bottom: 1px solid #edf5e8; background: #fafcf9; }
        .pdv-card-header-left { display: flex; align-items: center; gap: 8px; }
        .pdv-card-title { font-size: 12px; font-weight: 600; color: #2a4a35; text-transform: uppercase; letter-spacing: 0.6px; }
        .pdv-card-badge { font-size: 10.5px; font-weight: 500; color: #3e9654; background: #eef5ea; border: 1px solid #c4dfc8; border-radius: 12px; padding: 2px 8px; }
        .pdv-card-body { padding: 18px 18px; }

        /* MODE BADGES */
        .pdv-modo-novo { display: inline-flex; align-items: center; gap: 5px; font-size: 11px; font-weight: 600; padding: 3px 10px; border-radius: 20px; background: #e8f5e0; color: #1e5818; border: 1px solid #a8d898; }
        .pdv-modo-edicao { display: inline-flex; align-items: center; gap: 5px; font-size: 11px; font-weight: 600; padding: 3px 10px; border-radius: 20px; background: #fff8e0; color: #7a5200; border: 1px solid #e0c860; }
        .pdv-modo-dot { width: 6px; height: 6px; border-radius: 50%; flex-shrink: 0; }
        .pdv-modo-novo .pdv-modo-dot { background: #3e9654; }
        .pdv-modo-edicao .pdv-modo-dot { background: #c8a020; }

        /* FILTER ROW */
        .pdv-filter-row { display: flex; align-items: flex-end; gap: 12px; flex-wrap: wrap; }

        /* GRID */
        .pdv-grid { display: grid; grid-template-columns: repeat(12, 1fr); gap: 16px 14px; align-items: start; }
        .pdv-col-2  { grid-column: span 2; }
        .pdv-col-3  { grid-column: span 3; }
        .pdv-col-4  { grid-column: span 4; }
        .pdv-col-5  { grid-column: span 5; }
        .pdv-col-6  { grid-column: span 6; }
        .pdv-col-12 { grid-column: span 12; }

        /* FIELDS */
        .pdv-field { display: flex; flex-direction: column; gap: 5px; }
        .pdv-label { font-size: 10.5px; font-weight: 600; color: #5a8068; text-transform: uppercase; letter-spacing: 0.4px; display: flex; align-items: center; gap: 4px; }
        .pdv-label-req { color: #c84040; font-size: 12px; line-height: 1; }
        .pdv-input { width: 100%; height: 36px; background: #f8fbf6; border: 1.5px solid #d4e8cc; border-radius: 7px; padding: 0 10px; font-family: 'Inter', sans-serif; font-size: 13px; color: #1a2e22; outline: none; transition: border-color 0.13s, box-shadow 0.13s; }
        .pdv-input:focus { border-color: #3e9654; box-shadow: 0 0 0 2px rgba(62,150,84,0.1); }
        .pdv-input::placeholder { color: #b0c8b8; font-size: 12px; }
        .pdv-input:disabled { background: #f0f4ee; color: #8aaa94; cursor: not-allowed; border-color: #e0ead8; }
        .pdv-input.has-error { border-color: #e05252; box-shadow: 0 0 0 2px rgba(224,82,82,0.1); }
        .pdv-input[type="date"] { cursor: pointer; }

        .pdv-select { width: 100%; height: 36px; background: #f8fbf6; border: 1.5px solid #d4e8cc; border-radius: 7px; padding: 0 28px 0 10px; font-family: 'Inter', sans-serif; font-size: 13px; color: #1a2e22; outline: none; appearance: none; cursor: pointer; background-image: url("data:image/svg+xml,%3Csvg width='10' height='6' viewBox='0 0 10 6' xmlns='http://www.w3.org/2000/svg'%3E%3Cpath d='M1 1l4 4 4-4' stroke='%23789a84' stroke-width='1.5' fill='none' stroke-linecap='round' stroke-linejoin='round'/%3E%3C/svg%3E"); background-repeat: no-repeat; background-position: right 10px center; transition: border-color 0.13s; }
        .pdv-select:focus { border-color: #3e9654; box-shadow: 0 0 0 2px rgba(62,150,84,0.1); }

        .pdv-field-error { font-size: 11px; color: #c84040; margin-top: 2px; display: flex; align-items: center; gap: 4px; }
        .pdv-field-hint { font-size: 11px; color: #7a9c84; margin-top: 2px; line-height: 1.45; }

        /* CHECKBOX GROUP */
        .pdv-check-group { display: flex; flex-direction: column; gap: 10px; padding-top: 4px; }
        .pdv-check-row { display: flex; align-items: center; gap: 8px; }
        .pdv-check-row input[type="checkbox"] { width: 15px; height: 15px; accent-color: #3e9654; cursor: pointer; flex-shrink: 0; }
        .pdv-check-row label { font-size: 13px; color: #3a5a45; cursor: pointer; font-weight: 500; }

        /* SECTION DIVIDER */
        .pdv-section-sep { height: 1px; background: #edf5e8; margin: 20px 0; }
        .pdv-section-label { font-size: 10px; font-weight: 700; letter-spacing: 1px; text-transform: uppercase; color: #a0b8a8; margin-bottom: 14px; display: flex; align-items: center; gap: 8px; }
        .pdv-section-label::after { content: ''; flex: 1; height: 1px; background: #e8f0e4; }

        /* RESULTS TABLE */
        .pdv-results-wrap { border-top: 1px solid #edf5e8; overflow-x: auto; }
        .pdv-results-bar { display: flex; align-items: center; justify-content: space-between; padding: 10px 18px; background: #f4f9f2; border-bottom: 1px solid #e8f0e4; }
        .pdv-results-bar-left { display: flex; align-items: center; gap: 8px; }
        .pdv-results-bar-label { font-size: 11px; font-weight: 600; color: #4a7060; text-transform: uppercase; letter-spacing: 0.5px; }
        .pdv-results-hint { font-size: 11px; color: #96b8a0; }
        .pdv-results-table { width: 100%; border-collapse: collapse; font-size: 13px; }
        .pdv-results-table th { background: #f4f9f2; padding: 8px 12px; text-align: left; font-size: 10.5px; font-weight: 700; color: #5a8068; text-transform: uppercase; letter-spacing: 0.5px; border-bottom: 1.5px solid #dbe8d5; white-space: nowrap; }
        .pdv-results-table td { padding: 9px 12px; border-bottom: 1px solid #f0f6ec; color: #243830; vertical-align: middle; }
        .pdv-results-table tbody tr { cursor: pointer; transition: background 0.1s; }
        .pdv-results-table tbody tr:hover { background: #eef9f0; }
        .pdv-results-empty { text-align: center; padding: 28px 12px; color: #96b8a0; font-size: 12.5px; }

        .pdv-tipo-badge { display: inline-flex; align-items: center; font-size: 11px; font-weight: 600; border-radius: 12px; padding: 2px 8px; }
        .pdv-tipo-info { background: #e8f0fc; color: #1a4080; border: 1px solid #a8c0e8; }
        .pdv-tipo-escolha { background: #fdf8e8; color: #604800; border: 1px solid #e0d090; }
        .pdv-tipo-opcional { background: #fdf0e8; color: #603000; border: 1px solid #e0b890; }

        /* MODAL OVERLAY */
        .pdv-modal-overlay { position: fixed; inset: 0; background: rgba(0,0,0,0.35); z-index: 1000; display: flex; align-items: center; justify-content: center; animation: pdvFadeIn 0.15s ease; }
        .pdv-modal { background: #fff; border-radius: 14px; width: 90%; max-width: 800px; max-height: 85vh; overflow-y: auto; border: 1px solid #dbe8d5; box-shadow: 0 20px 50px rgba(0,0,0,0.15); }
        .pdv-modal-header { display: flex; align-items: center; justify-content: space-between; padding: 14px 20px; border-bottom: 1px solid #edf5e8; background: #fafcf9; }
        .pdv-modal-title { font-size: 13px; font-weight: 600; color: #2a4a35; text-transform: uppercase; letter-spacing: 0.5px; }
        .pdv-modal-close { background: transparent; border: none; cursor: pointer; color: #96b8a0; padding: 4px 8px; border-radius: 4px; font-size: 18px; transition: background 0.12s, color 0.12s; }
        .pdv-modal-close:hover { background: #f0f4ee; color: #5a8068; }
        .pdv-modal-body { padding: 18px 20px; }
        .pdv-modal-row { display: flex; gap: 10px; margin-bottom: 12px; flex-wrap: wrap; align-items: flex-end; }
        .pdv-modal-row .pdv-field { flex: 1; min-width: 100px; }

        /* FEEDBACK */
        .pdv-feedback { display: flex; align-items: center; gap: 9px; padding: 11px 15px; border-radius: 9px; font-size: 13px; animation: pdvFadeIn 0.2s ease; margin-bottom: 14px; }
        .pdv-feedback.success { background: #f0faf2; border: 1px solid #b4dec0; color: #1e6030; }
        .pdv-feedback.error { background: #fff5f5; border: 1px solid #f8c0c0; border-left: 3px solid #e05252; color: #b91c1c; }
        .pdv-feedback.info { background: #f0f8ff; border: 1px solid #c7def8; border-left: 3px solid #4a90d9; color: #1a4070; }

        /* FOOTER */
        .pdv-footer { background: #fff; border-top: 1px solid #dbe8d5; padding: 8px 20px; display: flex; align-items: center; justify-content: space-between; flex-shrink: 0; }
        .pdv-footer-left { display: flex; align-items: center; gap: 20px; }
        .pdv-footer-stat { display: flex; align-items: center; gap: 6px; font-size: 11.5px; color: #6a8a74; }
        .pdv-footer-stat strong { color: #1a2e22; font-weight: 600; }

        @keyframes pdvSpin { to { transform: rotate(360deg); } }
        .pdv-spinner { width: 14px; height: 14px; flex-shrink: 0; border: 2px solid rgba(223,240,226,0.3); border-top-color: #dff0e2; border-radius: 50%; animation: pdvSpin 0.65s linear infinite; }
        .pdv-spinner-dark { width: 14px; height: 14px; flex-shrink: 0; border: 2px solid #d4e8cc; border-top-color: #3e9654; border-radius: 50%; animation: pdvSpin 0.65s linear infinite; }
        @keyframes pdvFadeIn { from { opacity: 0; transform: translateY(-4px); } to { opacity: 1; transform: translateY(0); } }
      `}</style>

      <div className="pdv-root">
        {/* ── TOPBAR ── */}
        <header className="pdv-topbar">
          <div className="pdv-topbar-left">
            <div className="pdv-logo-mark">
              <svg width="15" height="15" viewBox="0 0 18 18" fill="none">
                <rect x="1.5" y="1.5" width="6" height="6" rx="1.2" fill="rgba(255,255,255,0.9)" />
                <rect x="10.5" y="1.5" width="6" height="6" rx="1.2" fill="rgba(255,255,255,0.4)" />
                <rect x="1.5" y="10.5" width="6" height="6" rx="1.2" fill="rgba(255,255,255,0.4)" />
                <rect x="10.5" y="10.5" width="6" height="6" rx="1.2" fill="rgba(255,255,255,0.7)" />
              </svg>
            </div>
            <span className="pdv-app-name">Venture<span className="pdv-app-sub">ERP &amp; Soluções</span></span>
            <span className="pdv-screen-title">VPDV0108 — Cadastro de Política Comercial de Descontos</span>
          </div>
        </header>

        {/* ── ACTION BAR ── */}
        <div className="pdv-actionbar">
          <div className="pdv-action-group">
            <span className="pdv-action-label">Cadastro</span>
            <button className="pdv-btn pdv-btn-new" onClick={handleNovo} disabled={isSaving}>
              <svg width="12" height="12" viewBox="0 0 12 12" fill="none"><path d="M6 2v8M2 6h8" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" /></svg>
              Novo
            </button>
          </div>
          <div className="pdv-action-group">
            <span className="pdv-action-label">Ações</span>
            <button className="pdv-btn pdv-btn-primary" onClick={() => void handleSalvar()} disabled={isSaving}>
              {isSaving
                ? <><div className="pdv-spinner" />Salvando...</>
                : <><svg width="13" height="13" viewBox="0 0 16 16" fill="none"><path d="M2 2h9l3 3v9a1 1 0 01-1 1H3a1 1 0 01-1-1V3a1 1 0 011-1z" stroke="currentColor" strokeWidth="1.4" strokeLinejoin="round" /><path d="M5 2v4h6V2M5 9h6" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" /></svg>Salvar</>
              }
            </button>
            <button className="pdv-btn pdv-btn-danger" onClick={handleLimpar} disabled={isSaving}>
              <svg width="13" height="13" viewBox="0 0 16 16" fill="none"><path d="M3 3l10 10M13 3L3 13" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" /></svg>
              Limpar
            </button>
          </div>
          <div className="pdv-action-group">
            <button className="pdv-btn pdv-btn-ghost">
              <svg width="13" height="13" viewBox="0 0 16 16" fill="none"><circle cx="8" cy="8" r="6" stroke="currentColor" strokeWidth="1.4" /><path d="M8 7v4M8 5.5h.01" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" /></svg>Ajuda
            </button>
          </div>
          <div className="pdv-action-group">
            <button className="pdv-btn pdv-btn-accent" onClick={() => { setShowPoliticaModal(true); setFeedback(null); }}>
              <svg width="12" height="12" viewBox="0 0 12 12" fill="none"><path d="M2 2h8v8H2z" stroke="currentColor" strokeWidth="1.4" /><path d="M5 5h2M6 4v2" stroke="currentColor" strokeWidth="1.2" strokeLinecap="round" /></svg>
              Política
            </button>
            <button className="pdv-btn pdv-btn-accent" onClick={() => { setShowGeracaoModal(true); setFeedback(null); }}>
              <svg width="12" height="12" viewBox="0 0 12 12" fill="none"><path d="M2 2h8v8H2z" stroke="currentColor" strokeWidth="1.4" /><path d="M5 5h2M6 4v2" stroke="currentColor" strokeWidth="1.2" strokeLinecap="round" /></svg>
              Ger. Automática
            </button>
          </div>
        </div>

        {/* ── BODY ── */}
        <div className="pdv-body">
          {feedback && (
            <div className={`pdv-feedback ${feedback.type}`}>
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

          {/* ═══════════════════════════════════════════════════════════ */}
          {/* SEÇÃO 1 — PESQUISAR                                        */}
          {/* ═══════════════════════════════════════════════════════════ */}
          <div className="pdv-section-banner">
            <span className="pdv-section-banner-pill">1 — Pesquisar</span>
            <div className="pdv-section-banner-line" />
            <span className="pdv-section-banner-hint">Filtre e clique em um registro para carregar no formulário</span>
          </div>
          <div className="pdv-card">
            <div className="pdv-card-header">
              <div className="pdv-card-header-left">
                <svg width="14" height="14" viewBox="0 0 16 16" fill="none"><circle cx="6.5" cy="6.5" r="4.5" stroke="#3e9654" strokeWidth="1.4" /><path d="M10 10l3.5 3.5" stroke="#3e9654" strokeWidth="1.4" strokeLinecap="round" /></svg>
                <span className="pdv-card-title">Pesquisa de Políticas</span>
              </div>
            </div>
            <div className="pdv-card-body" style={{ paddingBottom: 14 }}>
              <div className="pdv-filter-row">
                <div className="pdv-field" style={{ flex: "0 0 140px" }}>
                  <label className="pdv-label">Prioridade</label>
                  <input className="pdv-input" placeholder="Nº" value={filtroPrioridade} onChange={(e) => setFiltroPrioridade(e.target.value)} onKeyDown={(e) => e.key === "Enter" && void handlePesquisar()} />
                </div>
                <div className="pdv-field" style={{ flex: "0 0 140px" }}>
                  <label className="pdv-label">Sequência</label>
                  <input className="pdv-input" placeholder="Nº" value={filtroSequencia} onChange={(e) => setFiltroSequencia(e.target.value)} onKeyDown={(e) => e.key === "Enter" && void handlePesquisar()} />
                </div>
                <div className="pdv-field" style={{ flex: "0 0 180px" }}>
                  <label className="pdv-label">Validade</label>
                  <input type="date" className="pdv-input" value={filtroValidade} onChange={(e) => setFiltroValidade(e.target.value)} />
                </div>
                <div className="pdv-field" style={{ flex: "0 0 180px" }}>
                  <label className="pdv-label">Tipo</label>
                  <select className="pdv-select" value={filtroTipo} onChange={(e) => setFiltroTipo(e.target.value)}>
                    <option value="">Todos</option>
                    {TIPO_OPCOES.map((t) => <option key={t} value={t}>{t}</option>)}
                  </select>
                </div>
                <div style={{ alignSelf: "flex-end" }}>
                  <button className="pdv-btn pdv-btn-ghost" onClick={() => void handlePesquisar()} disabled={isSearching}>
                    {isSearching
                      ? <><div className="pdv-spinner-dark" />Buscando...</>
                      : <><svg width="13" height="13" viewBox="0 0 16 16" fill="none"><circle cx="6.5" cy="6.5" r="4.5" stroke="currentColor" strokeWidth="1.4" /><path d="M10 10l3.5 3.5" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" /></svg>Pesquisar</>
                    }
                  </button>
                </div>
              </div>
            </div>
            {mostrarResultados && (
              <div className="pdv-results-wrap">
                <div className="pdv-results-bar">
                  <div className="pdv-results-bar-left">
                    <svg width="13" height="13" viewBox="0 0 16 16" fill="none"><path d="M2 4h12M2 8h12M2 12h8" stroke="#5a8068" strokeWidth="1.4" strokeLinecap="round" /></svg>
                    <span className="pdv-results-bar-label">Resultados</span>
                    <span className="pdv-card-badge">{resultados.length} registro(s)</span>
                  </div>
                  <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                    <span className="pdv-results-hint">Clique para editar</span>
                    <button className="pdv-btn pdv-btn-ghost pdv-btn-sm" onClick={() => setMostrarResultados(false)}>Fechar</button>
                  </div>
                </div>
                {resultados.length === 0 ? (
                  <div className="pdv-results-empty">Nenhuma política encontrada.</div>
                ) : (
                  <table className="pdv-results-table">
                    <thead>
                      <tr>
                        <th style={{ width: 90 }}>Prioridade</th>
                        <th style={{ width: 100 }}>Sequência</th>
                        <th style={{ width: 110 }}>Início</th>
                        <th style={{ width: 110 }}>Fim</th>
                        <th style={{ width: 130 }}>Tipo</th>
                        <th style={{ width: 80 }}>Alt. Desc.</th>
                        <th style={{ width: 80 }}>Comissões</th>
                      </tr>
                    </thead>
                    <tbody>
                      {resultados.map((p) => (
                        <tr key={p.sequencia} onClick={() => handleSelectFromList(p)}>
                          <td style={{ fontWeight: 600, color: "#1a4a2a" }}>{p.prioridade}</td>
                          <td style={{ fontWeight: 600 }}>{p.sequencia}</td>
                          <td style={{ fontSize: 12 }}>{formatDateBR(p.validade_inicial)}</td>
                          <td style={{ fontSize: 12, color: p.validade_final ? "#243830" : "#96b8a0" }}>{p.validade_final ? formatDateBR(p.validade_final) : "Em aberto"}</td>
                          <td><span className={`pdv-tipo-badge ${TIPO_BADGE_CLASS[p.tipo as TipoPolitica] ?? ""}`}>{p.tipo}</span></td>
                          <td style={{ textAlign: "center" }}>{p.permite_alterar_descontos ? <span style={{ color: "#2a8040", fontWeight: 600 }}>Sim</span> : <span style={{ color: "#96b8a0" }}>Não</span>}</td>
                          <td style={{ textAlign: "center" }}>{p.usada_politica_comissoes ? <span style={{ color: "#2a8040", fontWeight: 600 }}>Sim</span> : <span style={{ color: "#96b8a0" }}>Não</span>}</td>
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
          <div className="pdv-section-banner">
            <span className="pdv-section-banner-pill">2 — Criar / Editar</span>
            <div className="pdv-section-banner-line" />
            <span className="pdv-section-banner-hint">
              {modoForm === "novo" ? "Preencha os campos e clique em Salvar" : `Editando Seq. ${codigoEdit ?? "?"}`}
            </span>
          </div>
          <div className="pdv-card">
            <div className="pdv-card-header">
              <div className="pdv-card-header-left">
                <svg width="14" height="14" viewBox="0 0 16 16" fill="none"><path d="M2 2h9l3 3v9a1 1 0 01-1 1H3a1 1 0 01-1-1V3a1 1 0 011-1z" stroke="#3e9654" strokeWidth="1.4" strokeLinejoin="round" /><path d="M5 2v4h6V2M5 9h6" stroke="#3e9654" strokeWidth="1.4" strokeLinecap="round" /></svg>
                <span className="pdv-card-title">Política Comercial de Descontos</span>
              </div>
              {modoForm === "novo"
                ? <span className="pdv-modo-novo"><span className="pdv-modo-dot" />Novo Cadastro</span>
                : <span className="pdv-modo-edicao"><span className="pdv-modo-dot" />Editando Seq. #{codigoEdit}</span>
              }
            </div>
            <div className="pdv-card-body">
              <div className="pdv-section-label">Identificação</div>
              <div className="pdv-grid">
                <div className="pdv-field pdv-col-2">
                  <label className="pdv-label">Prioridade <span className="pdv-label-req">*</span></label>
                  <input className={`pdv-input${errors.prioridade ? " has-error" : ""}`} placeholder="Nº" type="number" value={form.prioridade} onChange={(e) => setField("prioridade", e.target.value)} />
                  {errors.prioridade && <span className="pdv-field-error"><svg width="11" height="11" viewBox="0 0 12 12" fill="none"><circle cx="6" cy="6" r="5" stroke="#c84040" strokeWidth="1.2" /><path d="M6 4v2.5M6 8h.01" stroke="#c84040" strokeWidth="1.2" strokeLinecap="round" /></svg>{errors.prioridade}</span>}
                </div>
                <div className="pdv-field pdv-col-2">
                  <label className="pdv-label">Sequência <span className="pdv-label-req">*</span></label>
                  <input className={`pdv-input${errors.sequencia ? " has-error" : ""}`} placeholder="Nº" type="number" value={form.sequencia} onChange={(e) => setField("sequencia", e.target.value)} />
                  {errors.sequencia && <span className="pdv-field-error"><svg width="11" height="11" viewBox="0 0 12 12" fill="none"><circle cx="6" cy="6" r="5" stroke="#c84040" strokeWidth="1.2" /><path d="M6 4v2.5M6 8h.01" stroke="#c84040" strokeWidth="1.2" strokeLinecap="round" /></svg>{errors.sequencia}</span>}
                </div>
              </div>

              <div className="pdv-section-sep" />
              <div className="pdv-section-label">Validade</div>
              <div className="pdv-grid">
                <div className="pdv-field pdv-col-3">
                  <label className="pdv-label">Validade Inicial</label>
                  <input type="date" className="pdv-input" value={form.validade_inicial} onChange={(e) => setField("validade_inicial", e.target.value)} />
                </div>
                <div className="pdv-field pdv-col-3">
                  <label className="pdv-label">Validade Final</label>
                  <input type="date" className="pdv-input" value={form.validade_final} onChange={(e) => setField("validade_final", e.target.value)} />
                  <span className="pdv-field-hint">Deixe em branco para vigência indeterminada.</span>
                </div>
              </div>

              <div className="pdv-section-sep" />
              <div className="pdv-section-label">Configuração</div>
              <div className="pdv-grid">
                <div className="pdv-field pdv-col-3">
                  <label className="pdv-label">Tipo</label>
                  <select className="pdv-select" value={form.tipo} onChange={(e) => setField("tipo", e.target.value as TipoPolitica)}>
                    {TIPO_OPCOES.map((t) => <option key={t} value={t}>{t}</option>)}
                  </select>
                </div>
              </div>

              <div className="pdv-section-sep" />
              <div className="pdv-section-label">Opções</div>
              <div className="pdv-grid">
                <div className="pdv-field pdv-col-6">
                  <div className="pdv-check-group">
                    <div className="pdv-check-row">
                      <input type="checkbox" id="pdv-cb1" checked={form.permite_alterar_descontos} onChange={(e) => setField("permite_alterar_descontos", e.target.checked)} />
                      <label htmlFor="pdv-cb1">Permite alterar descontos</label>
                    </div>
                    <div className="pdv-check-row">
                      <input type="checkbox" id="pdv-cb2" checked={form.usada_politica_comissoes} onChange={(e) => setField("usada_politica_comissoes", e.target.checked)} />
                      <label htmlFor="pdv-cb2">Usada na Política de Comissões</label>
                    </div>
                    <div className="pdv-check-row">
                      <input type="checkbox" id="pdv-cb3" checked={form.politicas_aplicadas_itens} onChange={(e) => setField("politicas_aplicadas_itens", e.target.checked)} />
                      <label htmlFor="pdv-cb3">Políticas aplicadas a itens</label>
                    </div>
                    <div className="pdv-check-row">
                      <input type="checkbox" id="pdv-cb4" checked={form.permite_valores_maiores} onChange={(e) => setField("permite_valores_maiores", e.target.checked)} />
                      <label htmlFor="pdv-cb4">Permite informar valores maiores</label>
                    </div>
                  </div>
                </div>
                <div className="pdv-field pdv-col-6">
                  <div className="pdv-check-group">
                    <div className="pdv-check-row">
                      <input type="checkbox" id="pdv-cb5" checked={form.opcao_prazo_medio} onChange={(e) => setField("opcao_prazo_medio", e.target.checked)} />
                      <label htmlFor="pdv-cb5">Opção Prazo Médio</label>
                    </div>
                    <div className="pdv-check-row">
                      <input type="checkbox" id="pdv-cb6" checked={form.opcao_tipo_representante} onChange={(e) => setField("opcao_tipo_representante", e.target.checked)} />
                      <label htmlFor="pdv-cb6">Opção Tipo de Representante</label>
                    </div>
                  </div>
                </div>
              </div>

              {/* Política Linhas Summary */}
              {linhasPolitica.length > 0 && (
                <>
                  <div className="pdv-section-sep" />
                  <div className="pdv-section-label">Linhas da Política ({linhasPolitica.length})</div>
                  <table className="pdv-results-table" style={{ marginTop: 4 }}>
                    <thead><tr><th>Linha</th><th>Início</th><th>Fim</th><th>Valores Maiores</th><th></th></tr></thead>
                    <tbody>
                      {linhasPolitica.map((l, i) => (
                        <tr key={i}>
                          <td>{l.linha}</td><td>{l.inicio}</td><td>{l.fim}</td>
                          <td>{l.permite_valores_maiores ? "Sim" : "Não"}</td>
                          <td><button className="pdv-btn pdv-btn-ghost pdv-btn-sm" onClick={() => setLinhasPolitica((p) => p.filter((_, j) => j !== i))}>Remover</button></td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </>
              )}

              {/* Geracao Automatica Summary */}
              {geracoes.length > 0 && (
                <>
                  <div className="pdv-section-sep" />
                  <div className="pdv-section-label">Gerações Automáticas ({geracoes.length})</div>
                  <table className="pdv-results-table" style={{ marginTop: 4 }}>
                    <thead><tr><th>Seq.</th><th>Descrição</th><th>Tipo</th><th>Valor Mín.</th><th>Valor Máx.</th><th>Default</th><th></th></tr></thead>
                    <tbody>
                      {geracoes.map((g, i) => (
                        <tr key={i}>
                          <td>{g.sequencia}</td><td>{g.descricao}</td><td>{g.tipo}</td>
                          <td>{g.valor_minimo}</td><td>{g.valor_maximo}</td><td>{g.default_valor}</td>
                          <td><button className="pdv-btn pdv-btn-ghost pdv-btn-sm" onClick={() => setGeracoes((p) => p.filter((_, j) => j !== i))}>Remover</button></td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </>
              )}
            </div>
          </div>
        </div>

        {/* ── FOOTER ── */}
        <footer className="pdv-footer">
          <div className="pdv-footer-left">
            <div className="pdv-footer-stat">Prioridade: <strong>{form.prioridade || "—"}</strong></div>
            <div className="pdv-footer-stat">Sequência: <strong>{form.sequencia || "—"}</strong></div>
            <div className="pdv-footer-stat">Tipo: <strong>{form.tipo}</strong></div>
          </div>
          <div className="pdv-footer-stat" style={{ gap: 8 }}>
            {modoForm === "novo"
              ? <span className="pdv-modo-novo" style={{ fontSize: 11 }}><span className="pdv-modo-dot" />Novo Cadastro</span>
              : <span className="pdv-modo-edicao" style={{ fontSize: 11 }}><span className="pdv-modo-dot" />Editando #{codigoEdit}</span>
            }
            <span style={{ color: "#b0c8b8", fontSize: 11 }}>GRUPO VENTURE LTDA</span>
          </div>
        </footer>

        {/* ── MODAL: POLÍTICA (Linhas) ── */}
        {showPoliticaModal && (
          <div className="pdv-modal-overlay" onClick={(e) => { if (e.target === e.currentTarget) setShowPoliticaModal(false); }}>
            <div className="pdv-modal">
              <div className="pdv-modal-header">
                <span className="pdv-modal-title">Linhas da Política</span>
                <button className="pdv-modal-close" onClick={() => setShowPoliticaModal(false)}>&times;</button>
              </div>
              <div className="pdv-modal-body">
                <div className="pdv-modal-row">
                  <div className="pdv-field">
                    <label className="pdv-label">Linha</label>
                    <input type="number" className="pdv-input" value={linhaForm.linha} onChange={(e) => setLinhaForm((p) => ({ ...p, linha: Number(e.target.value) }))} />
                  </div>
                  <div className="pdv-field">
                    <label className="pdv-label">Início</label>
                    <input type="number" className="pdv-input" value={linhaForm.inicio} onChange={(e) => setLinhaForm((p) => ({ ...p, inicio: Number(e.target.value) }))} />
                  </div>
                  <div className="pdv-field">
                    <label className="pdv-label">Fim</label>
                    <input type="number" className="pdv-input" value={linhaForm.fim} onChange={(e) => setLinhaForm((p) => ({ ...p, fim: Number(e.target.value) }))} />
                  </div>
                  <div className="pdv-field" style={{ flex: "0 0 auto" }}>
                    <div className="pdv-check-row" style={{ paddingTop: 20 }}>
                      <input type="checkbox" id="pdv-mod-cb" checked={linhaForm.permite_valores_maiores} onChange={(e) => setLinhaForm((p) => ({ ...p, permite_valores_maiores: e.target.checked }))} />
                      <label htmlFor="pdv-mod-cb">Permite Valores Maiores</label>
                    </div>
                  </div>
                </div>
                <div style={{ display: "flex", gap: 8, marginTop: 8 }}>
                  <button className="pdv-btn pdv-btn-primary" onClick={addLinha}>Adicionar Linha</button>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* ── MODAL: GERAÇÃO AUTOMÁTICA ── */}
        {showGeracaoModal && (
          <div className="pdv-modal-overlay" onClick={(e) => { if (e.target === e.currentTarget) setShowGeracaoModal(false); }}>
            <div className="pdv-modal">
              <div className="pdv-modal-header">
                <span className="pdv-modal-title">Geração Automática</span>
                <button className="pdv-modal-close" onClick={() => setShowGeracaoModal(false)}>&times;</button>
              </div>
              <div className="pdv-modal-body">
                <div className="pdv-modal-row">
                  <div className="pdv-field">
                    <label className="pdv-label">Sequência</label>
                    <input type="number" className="pdv-input" value={geracaoForm.sequencia} onChange={(e) => setGeracaoForm((p) => ({ ...p, sequencia: Number(e.target.value) }))} />
                  </div>
                  <div className="pdv-field" style={{ flex: 2 }}>
                    <label className="pdv-label">Descrição</label>
                    <input className="pdv-input" value={geracaoForm.descricao} onChange={(e) => setGeracaoForm((p) => ({ ...p, descricao: e.target.value }))} />
                  </div>
                  <div className="pdv-field">
                    <label className="pdv-label">Tipo</label>
                    <select className="pdv-select" value={geracaoForm.tipo} onChange={(e) => setGeracaoForm((p) => ({ ...p, tipo: e.target.value as "Percentual" | "Valor" }))}>
                      <option value="Percentual">Percentual</option>
                      <option value="Valor">Valor</option>
                    </select>
                  </div>
                </div>
                <div className="pdv-modal-row">
                  <div className="pdv-field">
                    <label className="pdv-label">Valor Mínimo</label>
                    <input type="number" step="0.01" className="pdv-input" value={geracaoForm.valor_minimo} onChange={(e) => setGeracaoForm((p) => ({ ...p, valor_minimo: Number(e.target.value) }))} />
                  </div>
                  <div className="pdv-field">
                    <label className="pdv-label">Valor Máximo</label>
                    <input type="number" step="0.01" className="pdv-input" value={geracaoForm.valor_maximo} onChange={(e) => setGeracaoForm((p) => ({ ...p, valor_maximo: Number(e.target.value) }))} />
                  </div>
                  <div className="pdv-field">
                    <label className="pdv-label">Default Valor</label>
                    <input type="number" step="0.01" className="pdv-input" value={geracaoForm.default_valor} onChange={(e) => setGeracaoForm((p) => ({ ...p, default_valor: Number(e.target.value) }))} />
                  </div>
                </div>
                <div style={{ display: "flex", gap: 8, marginTop: 8 }}>
                  <button className="pdv-btn pdv-btn-primary" onClick={addGeracao}>Adicionar</button>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>
    </>
  );
}
